import { defineStore } from 'pinia';
import type { Schedule, Pagination } from '~/types';

export const useScheduleTermStore = defineStore('scheduleTerm', {
  state: () => ({
    schedules: [] as Schedule[],
    currentSchedule: null as Schedule | null,
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0
    } as Pagination,
    loading: false,
    error: null as string | null,
    formData: {
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      is_active: false,
      publication_status: 'draft',
      published_at: null,
      published_version: 0
    } as Partial<Schedule>,
    publishedHistory: []
  }),

  getters: {
    activeSchedules: (state) => state.schedules.filter((s) => s.is_active),
    upcomingSchedules: (state) => state.schedules.filter((s) => new Date(s.start_date) > new Date()),
    isPublished: (state) => state.currentSchedule?.publication_status === 'published',
    canPublish: (state) => {
      if (!state.currentSchedule) return false;
      return ['draft', 'revision'].includes(state.currentSchedule.publication_status);
    }
  },

  actions: {
    async fetchSchedules(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const { data, error } = await useFetch('/api/schedules', {
          params: {
            ...params,
            page: this.pagination.page,
            limit: this.pagination.limit
          }
        });

        if (error.value) throw new Error(error.value.message);

        this.schedules = data.value.schedules;
        this.pagination = data.value.pagination;

        return this.schedules;
      } catch (err) {
        this.error = err.message || 'Failed to fetch schedules';
        console.error('Error fetching schedules:', err);
        return [];
      } finally {
        this.loading = false;
      }
    },

    async fetchSchedule(id, options = { includeHistory: false }) {
      this.loading = true;
      this.error = null;

      try {
        // Add the includeHistory parameter to the query if needed
        const params = options.includeHistory ? { includeHistory: 'true' } : {};

        // Fetch the schedule data
        const { data, error } = await useFetch(`/api/schedules/${id}`, {
          params
        });

        if (error.value) throw new Error(error.value.message);

        // Update current schedule
        this.currentSchedule = data.value;

        // If the response includes history, update the publishHistory state
        if (data.value.publishHistory) {
          this.publishHistory = data.value.publishHistory;
        }
        // If we didn't get history but need it and schedule is published
        else if (options.includeHistory && this.currentSchedule?.published_version > 0) {
          // Fetch publication history separately using the direct DB method
          await this.fetchPublishHistory(id);
        }

        return this.currentSchedule;
      } catch (err) {
        this.error = err.message || 'Failed to fetch schedule';
        console.error('Error fetching schedule:', err);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async createSchedule(scheduleData) {
      this.loading = true;
      this.error = null;

      try {
        const { data, error } = await useFetch('/api/schedules/add', {
          method: 'POST',
          body: scheduleData
        });

        if (error.value) throw new Error(error.value.message);

        // Refresh schedules after creation
        await this.fetchSchedules();

        return data.value.schedule;
      } catch (err) {
        this.error = err.message || 'Failed to create schedule';
        console.error('Error creating schedule:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateSchedule(id, updates) {
      this.loading = true;
      this.error = null;

      try {
        const { data, error } = await useFetch(`/api/schedules/${id}`, {
          method: 'PUT',
          body: updates
        });

        if (error.value) throw new Error(error.value.message);

        // Update in local state if in the list
        const index = this.schedules.findIndex((s) => s.id === id);
        if (index !== -1) {
          this.schedules[index] = { ...this.schedules[index], ...updates };
        }

        // If this is the current schedule, update it too
        if (this.currentSchedule && this.currentSchedule.id === id) {
          this.currentSchedule = { ...this.currentSchedule, ...updates };
        }

        return data.value.schedule;
      } catch (err) {
        this.error = err.message || 'Failed to update schedule';
        console.error('Error updating schedule:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async duplicateSchedule(duplicateData) {
      this.loading = true;
      this.error = null;

      try {
        const { data, error } = await useFetch('/api/schedules/duplicate', {
          method: 'POST',
          body: duplicateData
        });

        if (error.value) throw new Error(error.value.message);

        // Refresh schedules after duplication
        await this.fetchSchedules();

        return data.value.schedule;
      } catch (err) {
        this.error = err.message || 'Failed to duplicate schedule';
        console.error('Error duplicating schedule:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async setActiveSchedule(id) {
      // First, deactivate all schedules
      for (const schedule of this.schedules.filter((s) => s.is_active)) {
        await this.updateSchedule(schedule.id, { is_active: false });
      }

      // Then activate the selected one
      return await this.updateSchedule(id, { is_active: true });
    },

    resetForm() {
      this.formData = {
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: false
      };
    },

    setFormData(data) {
      this.formData = { ...data };
    },
    async publishSchedule(scheduleId, options = {}) {
      this.loading = true;
      
      try {
        // Call the API endpoint
        const { data, error } = await useFetch('/api/schedules/publish', {
          method: 'POST',
          body: {
            scheduleId,
            notes: options.notes || '',
            sendNotifications: options.sendNotifications !== false // Default to true
          }
        });
        
        if (error.value) throw new Error(error.value.message);
        
        // Refresh the schedule data with history
        await this.fetchSchedule(scheduleId, { includeHistory: true });
        
        return data.value.schedule;
      } catch (err) {
        this.error = err.message || 'Failed to publish schedule';
        console.error('Error publishing schedule:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Add this action to save publish history
    async savePublishHistory(scheduleId, historyData) {
      try {
        const client = useSupabaseClient();

        const { error } = await client.from('schedule_publish_history').insert([
          {
            schedule_id: scheduleId,
            version: historyData.version,
            published_at: historyData.published_at,
            published_by: historyData.published_by,
            notes: historyData.notes
          }
        ]);

        if (error) throw error;

        // Refresh history
        await this.fetchPublishHistory(scheduleId);
      } catch (error) {
        console.error('Error saving publish history:', error);
        throw error;
      }
    },

    // Add this action to fetch publish history
    async fetchPublishHistory(scheduleId) {
      try {
        // Use query parameter instead of path parameter
        const { data, error } = await useFetch('/api/schedules/history', {
          params: { scheduleId }
        });
        
        if (error.value) throw new Error(error.value.message);
        
        this.publishHistory = data.value || [];
        return this.publishHistory;
      } catch (err) {
        console.error('Error fetching publication history:', err);
        this.error = err.message || 'Failed to fetch publication history';
        throw err;
      }
    },

    // Add this action to unpublish a schedule
    async unpublishSchedule(scheduleId, options = {}) {
      this.loading = true;
      
      try {
        // Call the API endpoint
        const { data, error } = await useFetch('/api/schedules/unpublish', {
          method: 'POST',
          body: {
            scheduleId,
            notes: options.notes || ''
          }
        });
        
        if (error.value) throw new Error(error.value.message);
        
        // Refresh the schedule data
        await this.fetchSchedule(scheduleId);
        
        return data.value.schedule;
      } catch (err) {
        this.error = err.message || 'Failed to unpublish schedule';
        console.error('Error unpublishing schedule:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    }
  }
});
