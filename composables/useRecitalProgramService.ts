
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
    formData.append('coverImage', imageFile);

    return await useFetch(`/api/recital-shows/${recitalId}/program/cover`, {
      method: 'PUT',
      body: formData
    });
  };

  /**
   * Add advertisement to recital program
   * @param {string} recitalId - UUID of the recital
   * @param {object} advertisementData - Advertisement data including image
   * @returns {Promise<object>} - Created advertisement data
   */
  const addAdvertisement = async (recitalId, advertisementData) => {
    const formData = new FormData();
    
    // Add all properties to formData
    Object.keys(advertisementData).forEach(key => {
      if (key === 'image' && advertisementData[key] instanceof File) {
        formData.append('image', advertisementData[key]);
      } else {
        formData.append(key, advertisementData[key]);
      }
    });

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
  const updateArtisticNote = async (recitalId, note) => {
    return await useFetch(`/api/recital-shows/${recitalId}/program/artistic-note`, {
      method: 'PUT',
      body: { note }
    });
  };

  /**
   * Update acknowledgments section
   * @param {string} recitalId - UUID of the recital
   * @param {string} acknowledgments - Updated acknowledgments content
   * @returns {Promise<object>} - Response with status
   */
  const updateAcknowledgments = async (recitalId, acknowledgments) => {
    return await useFetch(`/api/recital-shows/${recitalId}/program/acknowledgments`, {
      method: 'PUT',
      body: { acknowledgments }
    });
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