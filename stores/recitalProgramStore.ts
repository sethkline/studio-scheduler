import { defineStore } from 'pinia';
import { useRecitalProgramService } from '~/composables/useRecitalProgramService';

export const useRecitalProgramStore = defineStore('recitalProgram', {
  state: () => ({
    recital: null,
    program: null,
    performances: [],
    advertisements: [],
    dancers: [],
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
    orderedAdvertisements: (state) => [...state.advertisements].sort((a, b) => a.order_position - b.order_position)
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
     * Fetch enrolled students for a class instance
     * @param {string} classInstanceId - UUID of the class instance
     * @returns {Array} Array of student data with enrollment status
     */
    async fetchDancersForClass(classInstanceId) {
      this.loading.dancers = true;
      this.error = null;
      this.dancers = [];
      
      try {
        const client = useSupabaseClient();
        
        // Fetch enrolled students
        const { data, error } = await client
          .from('enrollments')
          .select(`
            id,
            status,
            student:student_id (
              id,
              first_name,
              last_name,
              date_of_birth
            )
          `)
          .eq('class_instance_id', classInstanceId);
        
        if (error) throw error;
        
        // Process student data
        const processedDancers = data.map(enrollment => {
          const student = enrollment.student;
          // Calculate age based on date of birth
          let age = null;
          if (student.date_of_birth) {
            const dob = new Date(student.date_of_birth);
            const now = new Date();
            age = now.getFullYear() - dob.getFullYear();
            // Adjust age if birthday hasn't occurred yet this year
            if (now.getMonth() < dob.getMonth() || 
                (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) {
              age--;
            }
          }
          
          return {
            id: enrollment.id,
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            age: age,
            status: enrollment.status
          };
        });
        
        this.dancers = processedDancers;
        return processedDancers;
      } catch (err) {
        this.error = err.message;
        console.error('Error fetching dancers:', err);
        return [];
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
        const { data, error } = await programService.updatePerformance(
          recitalId, 
          performanceId, 
          performanceData
        );
        
        if (error.value) throw new Error(error.value.message || 'Failed to update performance');
        
        // Update the performance in local state
        const index = this.performances.findIndex(p => p.id === performanceId);
        if (index !== -1) {
          this.performances[index] = { ...this.performances[index], ...data.value };
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
          const { data, error } = await programService.updateArtisticNote(
            recitalId, 
            content.artisticDirectorNote
          );
          
          if (error.value) throw new Error(error.value.message || 'Failed to update artistic note');
          result = data.value;
        }
        
        // Update acknowledgments if provided
        if (content.acknowledgments !== undefined) {
          const { data, error } = await programService.updateAcknowledgments(
            recitalId, 
            content.acknowledgments
          );
          
          if (error.value) throw new Error(error.value.message || 'Failed to update acknowledgments');
          result = data.value;
        }
        
        // Update local state
        if (this.program) {
          this.program = { ...this.program, ...content };
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
        const { data, error } = await programService.updateAdvertisement(
          recitalId, 
          adId, 
          advertisementData
        );
        
        if (error.value) throw new Error(error.value.message || 'Failed to update advertisement');
        
        // Update in local state
        const index = this.advertisements.findIndex(ad => ad.id === adId);
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
        this.advertisements = this.advertisements.filter(ad => ad.id !== adId);
        
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