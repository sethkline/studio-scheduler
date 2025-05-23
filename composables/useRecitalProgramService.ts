
export function useRecitalProgramService() {
  /**
   * Fetch full program data for a recital
   * @param {string} recitalId - UUID of the recital
   * @returns {Promise<object>} - Program data including performances, content, and metadata
   */
  const fetchRecitalProgram = async (recitalId) => {
    return await useFetch(`/api/recital-shows/${recitalId}/program`, {
      method: 'GET'
    });
  };

  /**
   * Create or update program details
   * @param {string} recitalId - UUID of the recital
   * @param {object} programData - Program data to save
   * @returns {Promise<object>} - Updated program data
   */
  const updateProgramDetails = async (recitalId, programData) => {
    return await useFetch(`/api/recital-shows/${recitalId}/program`, {
      method: 'POST',
      body: programData
    });
  };

  /**
   * Upload cover image for recital program
   * @param {string} recitalId - UUID of the recital
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<object>} - Response with image URL
   */
  const uploadCoverImage = async (recitalId, imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);

    return await useFetch(`/api/recital-shows/${recitalId}/program/cover`, {
      method: 'PUT',
      body: formData
    });
  };

  const removeCoverImage = async (recitalId) => {
    return await useFetch(`/api/recital-shows/${recitalId}/program/cover`, {
      method: 'DELETE'
    });
  };

  /**
   * Add advertisement to recital program
   * @param {string} recitalId - UUID of the recital
   * @param {object} advertisementData - Advertisement data including image
   * @returns {Promise<object>} - Created advertisement data
   */
  const addAdvertisement = async (recitalId, formData) => {
    // Log what we're sending
    console.log('Service adding advertisement');
    console.log('FormData entries:', [...formData.entries()]);
    
    // Pass the formData directly without modifications
    return await useFetch(`/api/recital-shows/${recitalId}/program/advertisements`, {
      method: 'POST',
      body: formData
    });
  };

  /**
   * Update an existing advertisement
   * @param {string} recitalId - UUID of the recital
   * @param {string} adId - UUID of the advertisement
   * @param {object} advertisementData - Updated advertisement data
   * @returns {Promise<object>} - Updated advertisement
   */
  const updateAdvertisement = async (recitalId, adId, advertisementData) => {
    const formData = new FormData();
    
    // Add all properties to formData
    Object.keys(advertisementData).forEach(key => {
      if (key === 'image' && advertisementData[key] instanceof File) {
        formData.append('image', advertisementData[key]);
      } else {
        formData.append(key, advertisementData[key]);
      }
    });

    return await useFetch(`/api/recital-shows/${recitalId}/program/advertisements/${adId}`, {
      method: 'PUT',
      body: formData
    });
  };

  /**
   * Delete an advertisement
   * @param {string} recitalId - UUID of the recital
   * @param {string} adId - UUID of the advertisement
   * @returns {Promise<object>} - Response with status
   */
  const deleteAdvertisement = async (recitalId, adId) => {
    return await useFetch(`/api/recital-shows/${recitalId}/program/advertisements/${adId}`, {
      method: 'DELETE'
    });
  };

  /**
   * Update performance order
   * @param {string} recitalId - UUID of the recital
   * @param {Array} performanceOrder - Array of performance IDs in desired order
   * @returns {Promise<object>} - Response with updated performances
   */
  const reorderPerformances = async (recitalId, performanceOrder) => {
    return await useFetch(`/api/recital-shows/${recitalId}/performances/reorder`, {
      method: 'PUT',
      body: { performanceOrder }
    });
  };

  /**
   * Update performance details
   * @param {string} recitalId - UUID of the recital
   * @param {string} performanceId - UUID of the performance
   * @param {object} performanceData - Updated performance data
   * @returns {Promise<object>} - Updated performance
   */
  const updatePerformance = async (recitalId, performanceId, performanceData) => {
    return await useFetch(`/api/recital-shows/${recitalId}/performances/${performanceId}`, {
      method: 'PUT',
      body: performanceData
    });
  };

  /**
   * Update artistic director's note
   * @param {string} recitalId - UUID of the recital
   * @param {string} note - Updated note content
   * @returns {Promise<object>} - Response with status
   */
  const updateArtisticNote = async (recitalId: string, note: string) => {
    try {
      // Validate content
      if (!note || note.trim() === '' || note === '<p></p>') {
        note = '<p>Not provided</p>';
      }
      
      // Make API call with valid content
      return await useFetch(`/api/recital-shows/${recitalId}/program/artistic-note`, {
        method: 'PUT',
        body: {
          note
        },
        // Disable request cancellation to prevent race conditions with auto-save
        options: {
          key: `update-artistic-note-${recitalId}-${Date.now()}`,
          immediate: true
        }
      });
    } catch (error) {
      console.error('Error updating artistic note:', error);
      throw error;
    }
  };

  /**
   * Update acknowledgments section
   * @param {string} recitalId - UUID of the recital
   * @param {string} acknowledgments - Updated acknowledgments content
   * @returns {Promise<object>} - Response with status
   */
  const updateAcknowledgments = async (recitalId: string, acknowledgments: string) => {
    try {
      // Validate content
      if (!acknowledgments || acknowledgments.trim() === '' || acknowledgments === '<p></p>') {
        acknowledgments = '<p>Not provided</p>';
      }
      
      console.log('Sending acknowledgments update with data:', {
        acknowledgments: acknowledgments // Important: This matches the expected parameter name on the server
      });
      
      // Make API call with valid content and correctly named parameter
      return await useFetch(`/api/recital-shows/${recitalId}/program/acknowledgments`, {
        method: 'PUT',
        body: {
          acknowledgments: acknowledgments // The server expects a parameter named 'acknowledgments'
        },
        // Disable request cancellation to prevent race conditions
        options: {
          key: `update-acknowledgments-${recitalId}-${Date.now()}`,
          immediate: true
        }
      });
    } catch (error) {
      console.error('Error updating acknowledgments:', error);
      throw error;
    }
  };

  /**
   * Generate and download program PDF
   * @param {string} recitalId - UUID of the recital
   * @returns {Promise<Blob>} - PDF file as blob
   */
  const generateProgramPDF = async (recitalId) => {
    const response = await fetch(`/api/recital-shows/${recitalId}/performances/export`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }
    
    return await response.blob();
  };

  return {
    fetchRecitalProgram,
    updateProgramDetails,
    uploadCoverImage,
    removeCoverImage,
    addAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    reorderPerformances,
    updatePerformance,
    updateArtisticNote,
    updateAcknowledgments,
    generateProgramPDF
  };
}