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

  async deleteFeature(id) {
    return this.request('deleteFeature', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  // Tasks
  async listTasks(featureId) {
    const params = featureId ? `?featureId=${featureId}` : '';
    return this.request(`listTasks${params}`);
  }

  async createTask(data) {
    return this.request('createTask', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id, updates) {
    return this.request('updateTask', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async deleteTask(id) {
    return this.request('deleteTask', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  // Bugs
  async listBugs(featureId) {
    const params = featureId ? `?featureId=${featureId}` : '';
    return this.request(`listBugs${params}`);
  }

  async createBug(data) {
    return this.request('createBug', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBug(id, updates) {
    return this.request('updateBug', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async deleteBug(id) {
    return this.request('deleteBug', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }
}

export default new ApiService();
