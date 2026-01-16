// Base URL for Cloud Functions
const BASE_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:5001/manage-easy-1768423759/us-central1'
  : 'https://us-central1-manage-easy-1768423759.cloudfunctions.net';

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}/${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Ideas
  async listUsers() {
    return this.request('listAllUsers');
  }

  async listIdeas() {
    return this.request('listIdeas');
  }

  async createIdea(data) {
    return this.request('createIdea', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIdea(id, updates) {
    return this.request('updateIdea', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async deleteIdea(id) {
    return this.request('deleteIdea', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  // Features
  async listFeatures(ideaId) {
    const params = ideaId ? `?ideaId=${ideaId}` : '';
    return this.request(`listFeatures${params}`);
  }

  async createFeature(data) {
    return this.request('createFeature', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFeature(id, updates) {
    return this.request('updateFeature', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async deleteFeature(id, ownerId) {
    return this.request('deleteFeature', {
      method: 'POST',
      body: JSON.stringify({ id, ownerId }),
    });
  }

  // Works
  async listWorks(featureId, ideaId) {
    let params = '';
    if (featureId) params += `?featureId=${featureId}`;
    if (ideaId) params += `${params ? '&' : '?'}ideaId=${ideaId}`;

    return this.request(`listWorks${params}`);
  }

  async createWork(data) {
    return this.request('createWork', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWork(id, updates) {
    return this.request('updateWork', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async deleteWork(id, ownerId) {
    return this.request('deleteWork', {
      method: 'POST',
      body: JSON.stringify({ id, ownerId }),
    });
  }

  // Comments
  async addComment(entityType, entityId, text, authorName) {
    return this.request('addComment', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, text, authorName }),
    });
  }

  async updateComment(entityType, entityId, commentId, text) {
    return this.request('updateComment', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, commentId, text }),
    });
  }

  async deleteComment(entityType, entityId, commentId) {
    return this.request('deleteComment', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, commentId }),
    });
  }
}

export default new ApiService();
