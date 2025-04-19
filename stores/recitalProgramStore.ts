import { defineStore } from 'pinia';
import { useRecitalProgramService } from '~/composables/useRecitalProgramService';

export const useRecitalProgramStore = defineStore('recitalProgram', {
  state: () => ({
    recital: null,
    program: null,
    performances: [],
    advertisements: [],
    performanceDancers: {}, // Map of performance ID to dancer array
    loading: {
      program: false,
      performances: false,
      dancers: false,
      saving: false,
      generating: false
    },
    error: null
  }),

  getters: {
    hasProgram: (state) => !!state.program,
    orderedPerformances: (state) => [...state.performances].sort((a, b) => a.performance_order - b.performance_order),
    orderedAdvertisements: (state) => [...state.advertisements].sort((a, b) => a.order_position - b.order_position),

    // Return formatted dancer names for a performance
    getDancerNamesString: (state) => (performanceId) => {
      // Check if we have dancers in our performanceDancers map
      if (state.performanceDancers[performanceId] && state.performanceDancers[performanceId].length > 0) {
        return state.performanceDancers[performanceId]
          .map((dancer) => dancer.student_name || dancer.dancer_name)
          .join(', ');
      }

      // Fallback to looking in the performance object
      const performance = state.performances.find((p) => p.id === performanceId);
      if (!performance) return '';

      // Check if dancer data is attached to the performance
      if (performance.dancers && performance.dancers.length > 0) {
        return performance.dancers.map((dancer) => dancer.student_name || dancer.dancer_name).join(', ');
      }

      // Fallback to notes field if it contains dancers
      if (performance.notes && performance.notes.toLowerCase().includes('dancers:')) {
        return performance.notes.substring(performance.notes.toLowerCase().indexOf('dancers:') + 8).trim();
      }

      return '';
    }
  },

  actions: {
    /**
     * Load all program data for a recital
     * @param {string} recitalId - UUID of the recital
     */
    async fetchProgram(recitalId) {
      this.loading.program = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        const { data, error } = await programService.fetchRecitalProgram(recitalId);

        if (error.value) throw new Error(error.value.message || 'Failed to fetch program data');

        this.recital = data.value.recital;
        this.program = data.value.program;
        this.performances = data.value.performances || [];
        this.advertisements = data.value.advertisements || [];

        return data.value;
      } catch (err) {
        this.error = err.message;
        console.error('Error fetching program:', err);
        return null;
      } finally {
        this.loading.program = false;
      }
    },

    /**
     * Fetch dancers for all performances in a recital
     * @param {string} recitalId - UUID of the recital
     */
    async fetchPerformanceDancers(recitalId) {
      this.loading.dancers = true;
      this.error = null;
      this.performanceDancers = {};

      try {
        const client = useSupabaseClient();

        // Get all performance IDs for this recital
        const performanceIds = this.performances.map((p) => p.id);

        if (performanceIds.length === 0) {
          return {};
        }

        // First try to fetch dancers from the performance_dancers table
        const { data: dbDancers, error: dbError } = await client
          .from('performance_dancers')
          .select(
            `
            id,
            performance_id,
            dancer_name,
            student:student_id (
              id,
              first_name,
              last_name
            )
          `
          )
          .in('performance_id', performanceIds);

        if (dbError) throw dbError;

        // Process database dancer records
        const dancersByPerformance = {};

        // Handle database records
        if (dbDancers && dbDancers.length > 0) {
          // Group dancers by performance ID
          for (const dancer of dbDancers) {
            if (!dancersByPerformance[dancer.performance_id]) {
              dancersByPerformance[dancer.performance_id] = [];
            }

            const dancerObj = {
              id: dancer.id,
              dancer_name: dancer.dancer_name
            };

            // Add student info if available
            if (dancer.student) {
              dancerObj.student_id = dancer.student.id;
              dancerObj.student_name = `${dancer.student.first_name} ${dancer.student.last_name}`;
            }

            dancersByPerformance[dancer.performance_id].push(dancerObj);
          }
        }

        // Fall back to the notes field for performances without database records
        for (const performance of this.performances) {
          if (
            !dancersByPerformance[performance.id] &&
            performance.notes &&
            performance.notes.toLowerCase().includes('dancers:')
          ) {
            const dancersText = performance.notes
              .substring(performance.notes.toLowerCase().indexOf('dancers:') + 8)
              .trim();

            const dancerNames = dancersText
              .split(',')
              .map((name) => name.trim())
              .filter(Boolean);

            dancersByPerformance[performance.id] = dancerNames.map((name) => ({
              dancer_name: name
            }));
          }
        }

        // Store in state
        this.performanceDancers = dancersByPerformance;

        // Also add dancers directly to performance objects for compatibility
        for (const performance of this.performances) {
          if (dancersByPerformance[performance.id]) {
            performance.dancers = dancersByPerformance[performance.id];
          }
        }

        return dancersByPerformance;
      } catch (err) {
        this.error = err.message;
        console.error('Error fetching performance dancers:', err);
        return {};
      } finally {
        this.loading.dancers = false;
      }
    },

    /**
     * Save new performance order
     * @param {string} recitalId - UUID of the recital
     * @param {Array} performances - Array of performances in desired order
     */
    async savePerformanceOrder(recitalId, performances) {
      this.loading.saving = true;
      this.error = null;

      try {
        // Create array of performance IDs in the new order
        const performanceOrder = performances.map((perf, index) => ({
          id: perf.id,
          performance_order: index + 1
        }));

        const programService = useRecitalProgramService();
        const { data, error } = await programService.reorderPerformances(recitalId, performanceOrder);

        if (error.value) throw new Error(error.value.message || 'Failed to save performance order');

        // Update local state with new order
        this.performances = data.value.performances;

        return data.value;
      } catch (err) {
        this.error = err.message;
        console.error('Error saving performance order:', err);
        return null;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Update a single performance
     * @param {string} recitalId - UUID of the recital
     * @param {string} performanceId - UUID of the performance
     * @param {object} performanceData - Updated performance data
     */
    async updatePerformance(recitalId, performanceId, performanceData) {
      this.loading.saving = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        const { data, error } = await programService.updatePerformance(recitalId, performanceId, performanceData);

        if (error.value) throw new Error(error.value.message || 'Failed to update performance');

        // Update the performance in local state
        const index = this.performances.findIndex((p) => p.id === performanceId);
        if (index !== -1) {
          this.performances[index] = { ...this.performances[index], ...data.value };
        }

        // If this update includes notes with dancers, update our dancers mapping
        if (performanceData.notes && performanceData.notes.includes('Dancers:')) {
          const dancersText = performanceData.notes.substring(performanceData.notes.indexOf('Dancers:') + 8).trim();

          const dancerNames = dancersText
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean);

          this.performanceDancers[performanceId] = dancerNames.map((name) => ({
            dancer_name: name
          }));
        }

        return data.value;
      } catch (err) {
        this.error = err.message;
        console.error('Error updating performance:', err);
        return null;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Save program content (artistic note and acknowledgments)
     * @param {string} recitalId - UUID of the recital
     * @param {object} content - Program content data
     */
    async saveProgramContent(recitalId, content) {
      this.loading.saving = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        let result;

        // Update artistic director's note if provided
        if (content.artisticDirectorNote !== undefined) {
          const { data, error } = await programService.updateArtisticNote(recitalId, content.artisticDirectorNote);

          if (error.value) throw new Error(error.value.message || 'Failed to update artistic note');
          result = data.value;
        }

        // Update acknowledgments if provided
        if (content.acknowledgments !== undefined) {
          const { data, error } = await programService.updateAcknowledgments(recitalId, content.acknowledgments);

          if (error.value) throw new Error(error.value.message || 'Failed to update acknowledgments');
          result = data.value;
        }

        // Update local state
        if (this.program) {
          this.program = {
            ...this.program,
            artistic_director_note: content.artisticDirectorNote,
            acknowledgments: content.acknowledgments
          };
        }

        return result;
      } catch (err) {
        this.error = err.message;
        console.error('Error saving program content:', err);
        return null;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Upload cover image for the program
     * @param {string} recitalId - UUID of the recital
     * @param {File} imageFile - Image file to upload
     */
    async uploadCoverImage(recitalId, imageFile) {
      this.loading.saving = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        const { data, error } = await programService.uploadCoverImage(recitalId, imageFile);

        if (error.value) throw new Error(error.value.message || 'Failed to upload cover image');

        // Update local state
        if (this.program) {
          this.program.cover_image_url = data.value.coverImageUrl;
        }

        return data.value;
      } catch (err) {
        this.error = err.message;
        console.error('Error uploading cover image:', err);
        return null;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Add a new advertisement
     * @param {string} recitalId - UUID of the recital
     * @param {object} advertisementData - Advertisement data including image
     */
    async addAdvertisement(recitalId, advertisementData) {
      this.loading.saving = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        const { data, error } = await programService.addAdvertisement(recitalId, advertisementData);

        if (error.value) throw new Error(error.value.message || 'Failed to add advertisement');

        // Add to local state
        this.advertisements.push(data.value);

        return data.value;
      } catch (err) {
        this.error = err.message;
        console.error('Error adding advertisement:', err);
        return null;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Update an existing advertisement
     * @param {string} recitalId - UUID of the recital
     * @param {string} adId - UUID of the advertisement
     * @param {object} advertisementData - Updated advertisement data
     */
    async updateAdvertisement(recitalId, adId, advertisementData) {
      this.loading.saving = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        const { data, error } = await programService.updateAdvertisement(recitalId, adId, advertisementData);

        if (error.value) throw new Error(error.value.message || 'Failed to update advertisement');

        // Update in local state
        const index = this.advertisements.findIndex((ad) => ad.id === adId);
        if (index !== -1) {
          this.advertisements[index] = { ...this.advertisements[index], ...data.value };
        }

        return data.value;
      } catch (err) {
        this.error = err.message;
        console.error('Error updating advertisement:', err);
        return null;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Delete an advertisement
     * @param {string} recitalId - UUID of the recital
     * @param {string} adId - UUID of the advertisement
     */
    async deleteAdvertisement(recitalId, adId) {
      this.loading.saving = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        const { error } = await programService.deleteAdvertisement(recitalId, adId);

        if (error.value) throw new Error(error.value.message || 'Failed to delete advertisement');

        // Remove from local state
        this.advertisements = this.advertisements.filter((ad) => ad.id !== adId);

        return true;
      } catch (err) {
        this.error = err.message;
        console.error('Error deleting advertisement:', err);
        return false;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Update dancers information for a performance
     * @param {string} recitalId - UUID of the recital
     * @param {string} performanceId - UUID of the performance
     * @param {Array} dancersList - Array of dancer objects to include
     */
    async updatePerformanceDancers(recitalId, performanceId, dancersList) {
      this.loading.saving = true;
      this.error = null;

      try {
        const client = useSupabaseClient();

        // First, delete any existing performance dancers
        await client.from('performance_dancers').delete().eq('performance_id', performanceId);

        // If we have dancers to insert, prepare and insert them
        if (dancersList && dancersList.length > 0) {
          // Then insert the new dancers
          const dancersToInsert = dancersList.map((dancer) => ({
            performance_id: performanceId,
            dancer_name: dancer.dancer_name || dancer.student_name || dancer,
            student_id: dancer.student_id || null,
            created_at: new Date().toISOString()
          }));

          const { error } = await client.from('performance_dancers').insert(dancersToInsert);

          if (error) throw error;
        }

        // Update local state
        this.performanceDancers[performanceId] = dancersList;

        // Also update the performance object if it exists in our state
        const performance = this.performances.find((p) => p.id === performanceId);
        if (performance) {
          performance.dancers = dancersList;
        }

        return true;
      } catch (err) {
        this.error = err.message;
        console.error('Error updating performance dancers:', err);
        return false;
      } finally {
        this.loading.saving = false;
      }
    },

    /**
     * Fetch dancers for a specific performance
     * @param {string} performanceId - UUID of the performance
     * @returns {Array} Array of dancer data
     */
    async fetchDancersForPerformance(performanceId) {
      this.loading.dancers = true;
      this.error = null;

      try {
        const client = useSupabaseClient();

        // Fetch dancers linked to this performance
        const { data, error } = await client
          .from('performance_dancers')
          .select(
            `
            id,
            dancer_name,
            student:student_id (
              id,
              first_name,
              last_name
            )
          `
          )
          .eq('performance_id', performanceId);

        if (error) throw error;

        // Process dancer data
        const performanceDancers = data.map((item) => {
          const dancer = {
            id: item.id,
            dancer_name: item.dancer_name
          };

          // Add student info if available
          if (item.student) {
            dancer.student_id = item.student.id;
            dancer.student_name = `${item.student.first_name} ${item.student.last_name}`;
          }

          return dancer;
        });

        // Update local state
        this.performanceDancers[performanceId] = performanceDancers;

        // Also update the performance object if it exists in our state
        const performance = this.performances.find((p) => p.id === performanceId);
        if (performance) {
          performance.dancers = performanceDancers;
        }

        return performanceDancers;
      } catch (err) {
        this.error = err.message;
        console.error('Error fetching performance dancers:', err);
        return [];
      } finally {
        this.loading.dancers = false;
      }
    },

    /**
     * Search for dancers by name
     * @param {string} searchTerm - Name to search for
     * @param {string} recitalId - Optional recital ID to limit search
     * @returns {Array} Array of matching dancers with their performances
     */
    async searchDancers(searchTerm, recitalId = null) {
      this.loading.dancers = true;
      this.error = null;

      try {
        const client = useSupabaseClient();

        // Create the base query
        let query = client
          .from('performance_dancers')
          .select(
            `
            id,
            dancer_name,
            performance_id,
            student:student_id (
              id, 
              first_name,
              last_name
            ),
            performance:performance_id (
              id,
              song_title,
              performance_order,
              recital_id,
              class_instance:class_instance_id (
                id,
                name,
                class_definition:class_definition_id (
                  id,
                  name,
                  dance_style:dance_style_id (
                    id,
                    name,
                    color
                  )
                )
              )
            )
          `
          )
          .ilike('dancer_name', `%${searchTerm}%`);

        // Add recital filter if provided
        if (recitalId) {
          query = query.eq('performance.recital_id', recitalId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Process and group results by dancer
        const dancerMap = new Map();

        for (const record of data) {
          const dancerName = record.dancer_name;
          const performanceData = {
            id: record.performance.id,
            title: record.performance.song_title,
            order: record.performance.performance_order,
            recital_id: record.performance.recital_id,
            class_name: record.performance.class_instance?.name || '',
            dance_style: record.performance.class_instance?.class_definition?.dance_style?.name || '',
            style_color: record.performance.class_instance?.class_definition?.dance_style?.color || '#cccccc'
          };

          if (!dancerMap.has(dancerName)) {
            // Extract first/last name from dancer_name
            const nameParts = dancerName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            dancerMap.set(dancerName, {
              name: dancerName,
              first_name: firstName,
              last_name: lastName,
              student_id: record.student?.id || null,
              performances: [performanceData],
              recitals: [record.performance.recital_id]
            });
          } else {
            const dancer = dancerMap.get(dancerName);
            dancer.performances.push(performanceData);

            // Add recital ID if not already in the list
            if (!dancer.recitals.includes(record.performance.recital_id)) {
              dancer.recitals.push(record.performance.recital_id);
            }
          }
        }

        // Convert map to array and add performance count
        const dancerList = Array.from(dancerMap.values()).map((dancer) => ({
          ...dancer,
          performance_count: dancer.performances.length
        }));

        // Sort by number of performances (most to least)
        dancerList.sort((a, b) => b.performance_count - a.performance_count);

        return {
          dancers: dancerList,
          count: dancerList.length
        };
      } catch (err) {
        this.error = err.message;
        console.error('Error searching dancers:', err);
        return { dancers: [], count: 0 };
      } finally {
        this.loading.dancers = false;
      }
    },

    /**
     * Generate and download the program PDF
     * @param {string} recitalId - UUID of the recital
     */
    async generatePdf(recitalId) {
      this.loading.generating = true;
      this.error = null;

      try {
        const programService = useRecitalProgramService();
        const pdfBlob = await programService.generateProgramPDF(recitalId);

        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const recitalName = this.recital?.name || 'recital';
        const link = document.createElement('a');
        link.href = url;
        link.download = `${recitalName.toLowerCase().replace(/\s+/g, '-')}-program.pdf`;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
      } catch (err) {
        this.error = err.message;
        console.error('Error generating PDF:', err);
        return false;
      } finally {
        this.loading.generating = false;
      }
    }
  }
});
