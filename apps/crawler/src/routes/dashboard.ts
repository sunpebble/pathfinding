/**
 * Dashboard Routes
 * Web UI for managing and monitoring the crawler service
 */

import type { Context } from 'hono';
import { Hono } from 'hono';
import { html } from 'hono/html';

export const dashboardRouter = new Hono();

// Dashboard HTML page
const dashboardHTML = html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Pathfinding Crawler Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
        .status-pending {
          color: #f59e0b;
        }
        .status-running {
          color: #3b82f6;
        }
        .status-completed {
          color: #10b981;
        }
        .status-failed {
          color: #ef4444;
        }
        .status-cancelled {
          color: #6b7280;
        }
      </style>
    </head>
    <body class="bg-gray-100 min-h-screen">
      <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <header class="mb-8">
          <h1 class="text-3xl font-bold text-gray-800">
            🕷️ Pathfinding Crawler Dashboard
          </h1>
          <p class="text-gray-600 mt-2">
            Manage and monitor data crawling jobs
          </p>
        </header>

        <!-- Status Bar -->
        <div
          id="status-bar"
          class="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <span
              id="health-indicator"
              class="w-3 h-3 rounded-full bg-gray-400"
            ></span>
            <span id="health-status" class="text-gray-600">Checking...</span>
          </div>
          <div class="text-sm text-gray-500">
            Last updated: <span id="last-updated">-</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-gray-200 mb-6">
          <button
            class="tab-btn px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600"
            data-tab="jobs"
          >
            Crawl Jobs
          </button>
          <button
            class="tab-btn px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
            data-tab="pois"
          >
            POIs
          </button>
          <button
            class="tab-btn px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
            data-tab="datasets"
          >
            Training Datasets
          </button>
          <button
            class="tab-btn px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
            data-tab="create"
          >
            Create Job
          </button>
        </div>

        <!-- Tab Content: Crawl Jobs -->
        <div id="tab-jobs" class="tab-content active">
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b flex justify-between items-center">
              <h2 class="text-xl font-semibold">Crawl Jobs</h2>
              <button
                onclick="loadJobs()"
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      ID
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Name
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Platform
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Status
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Progress
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Created
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody id="jobs-table-body" class="divide-y divide-gray-200">
                  <tr>
                    <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab Content: POIs -->
        <div id="tab-pois" class="tab-content">
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b">
              <h2 class="text-xl font-semibold mb-4">Search POIs</h2>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  id="poi-query"
                  placeholder="Search query..."
                  class="border rounded px-3 py-2"
                />
                <select id="poi-category" class="border rounded px-3 py-2">
                  <option value="">All Categories</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="attraction">Attraction</option>
                  <option value="shopping">Shopping</option>
                </select>
                <input
                  type="text"
                  id="poi-city"
                  placeholder="City..."
                  class="border rounded px-3 py-2"
                />
                <button
                  onclick="searchPOIs()"
                  class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Search
                </button>
              </div>
            </div>
            <div class="p-4">
              <div
                id="pois-results"
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <p class="text-gray-500 col-span-full text-center py-8">
                  Enter search criteria and click Search
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Content: Training Datasets -->
        <div id="tab-datasets" class="tab-content">
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b flex justify-between items-center">
              <h2 class="text-xl font-semibold">Training Datasets</h2>
              <button
                onclick="loadDatasets()"
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      ID
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Name
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Type
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Status
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Records
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody
                  id="datasets-table-body"
                  class="divide-y divide-gray-200"
                >
                  <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab Content: Create Job -->
        <div id="tab-create" class="tab-content">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-6">Create New Crawl Job</h2>
            <form id="create-job-form" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Job Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    class="w-full border rounded px-3 py-2"
                    placeholder="e.g., Tokyo Restaurants Crawl"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Platform *
                  </label>
                  <select
                    name="platform"
                    required
                    class="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select platform...</option>
                    <option value="amap">Amap (高德地图)</option>
                    <option value="openstreetmap">OpenStreetMap</option>
                    <option value="overpass">Overpass API</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Job Type
                  </label>
                  <select
                    name="job_type"
                    class="w-full border rounded px-3 py-2"
                  >
                    <option value="full">Full Crawl</option>
                    <option value="incremental">Incremental Update</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (Cron)
                  </label>
                  <input
                    type="text"
                    name="schedule_cron"
                    class="w-full border rounded px-3 py-2"
                    placeholder="e.g., 0 0 * * * (daily at midnight)"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Categories (comma-separated)
                </label>
                <input
                  type="text"
                  name="categories"
                  class="w-full border rounded px-3 py-2"
                  placeholder="e.g., restaurant, hotel, attraction"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Cities (comma-separated)
                </label>
                <input
                  type="text"
                  name="cities"
                  class="w-full border rounded px-3 py-2"
                  placeholder="e.g., Tokyo, Osaka, Kyoto"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Rate Limit (requests/second)
                  </label>
                  <input
                    type="number"
                    name="rate_limit_rps"
                    class="w-full border rounded px-3 py-2"
                    value="1"
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Max Concurrent Requests
                  </label>
                  <input
                    type="number"
                    name="max_concurrent"
                    class="w-full border rounded px-3 py-2"
                    value="5"
                    min="1"
                  />
                </div>
              </div>

              <div class="flex gap-4">
                <button
                  type="submit"
                  class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create Job
                </button>
                <button
                  type="reset"
                  class="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Toast Notification -->
        <div
          id="toast"
          class="fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform translate-y-full opacity-0 transition-all duration-300"
        ></div>
      </div>

      <script>
        const API_BASE = '/api';

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach((b) => {
              b.classList.remove(
                'text-blue-600',
                'border-b-2',
                'border-blue-600'
              );
              b.classList.add('text-gray-500');
            });
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            btn.classList.remove('text-gray-500');

            document.querySelectorAll('.tab-content').forEach((tab) => {
              tab.classList.remove('active');
            });
            document
              .getElementById('tab-' + btn.dataset.tab)
              .classList.add('active');
          });
        });

        // Toast notification
        function showToast(message, type = 'success') {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.className =
            'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300';
          toast.classList.add(
            type === 'success' ? 'bg-green-500' : 'bg-red-500',
            'text-white'
          );
          toast.classList.remove('translate-y-full', 'opacity-0');

          setTimeout(() => {
            toast.classList.add('translate-y-full', 'opacity-0');
          }, 3000);
        }

        // Check health status
        async function checkHealth() {
          try {
            const res = await fetch('/health');
            const data = await res.json();
            const indicator = document.getElementById('health-indicator');
            const status = document.getElementById('health-status');

            if (data.status === 'healthy') {
              indicator.classList.remove('bg-gray-400', 'bg-red-500');
              indicator.classList.add('bg-green-500');
              status.textContent = 'Service Healthy';
            } else {
              indicator.classList.remove('bg-gray-400', 'bg-green-500');
              indicator.classList.add('bg-red-500');
              status.textContent = 'Service Unhealthy';
            }

            document.getElementById('last-updated').textContent =
              new Date().toLocaleTimeString();
          } catch (error) {
            document
              .getElementById('health-indicator')
              .classList.add('bg-red-500');
            document.getElementById('health-status').textContent =
              'Connection Error';
          }
        }

        // Load crawl jobs
        async function loadJobs() {
          try {
            const res = await fetch(API_BASE + '/crawl-jobs');
            const { data, pagination } = await res.json();

            const tbody = document.getElementById('jobs-table-body');
            if (!data || data.length === 0) {
              tbody.innerHTML =
                '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No jobs found</td></tr>';
              return;
            }

            tbody.innerHTML = data
              .map(
                (job) =>
                  '<tr class="hover:bg-gray-50">' +
                  '<td class="px-4 py-3 text-sm font-mono">' +
                  job.id.slice(0, 8) +
                  '...</td>' +
                  '<td class="px-4 py-3 font-medium">' +
                  job.name +
                  '</td>' +
                  '<td class="px-4 py-3">' +
                  job.platform +
                  '</td>' +
                  '<td class="px-4 py-3"><span class="status-' +
                  job.status +
                  ' font-medium">' +
                  job.status +
                  '</span></td>' +
                  '<td class="px-4 py-3">' +
                  (job.statistics
                    ? job.statistics.records_extracted + ' records'
                    : '-') +
                  '</td>' +
                  '<td class="px-4 py-3 text-sm text-gray-500">' +
                  new Date(job.created_at).toLocaleString() +
                  '</td>' +
                  '<td class="px-4 py-3">' +
                  '<div class="flex gap-2">' +
                  (job.status === 'pending'
                    ? '<button onclick="startJob(\\'' +
                      job.id +
                      '\\')" class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">Start</button>'
                    : '') +
                  (job.status === 'running'
                    ? '<button onclick="cancelJob(\\'' +
                      job.id +
                      '\\')" class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Cancel</button>'
                    : '') +
                  '<button onclick="viewJob(\\'' +
                  job.id +
                  '\\')" class="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">View</button>' +
                  '</div>' +
                  '</td>' +
                  '</tr>'
              )
              .join('');
          } catch (error) {
            showToast('Failed to load jobs: ' + error.message, 'error');
          }
        }

        // Start a job
        async function startJob(jobId) {
          try {
            const res = await fetch(
              API_BASE + '/crawl-jobs/' + jobId + '/start',
              {
                method: 'POST',
              }
            );
            if (res.ok) {
              showToast('Job started successfully');
              loadJobs();
            } else {
              const err = await res.json();
              showToast(err.message || 'Failed to start job', 'error');
            }
          } catch (error) {
            showToast('Failed to start job: ' + error.message, 'error');
          }
        }

        // Cancel a job
        async function cancelJob(jobId) {
          if (!confirm('Are you sure you want to cancel this job?')) return;
          try {
            const res = await fetch(
              API_BASE + '/crawl-jobs/' + jobId + '/cancel',
              {
                method: 'POST',
              }
            );
            if (res.ok) {
              showToast('Job cancelled');
              loadJobs();
            } else {
              const err = await res.json();
              showToast(err.message || 'Failed to cancel job', 'error');
            }
          } catch (error) {
            showToast('Failed to cancel job: ' + error.message, 'error');
          }
        }

        // View job details
        async function viewJob(jobId) {
          try {
            const res = await fetch(API_BASE + '/crawl-jobs/' + jobId);
            const data = await res.json();
            alert(JSON.stringify(data, null, 2));
          } catch (error) {
            showToast('Failed to load job details', 'error');
          }
        }

        // Search POIs
        async function searchPOIs() {
          const query = document.getElementById('poi-query').value;
          const category = document.getElementById('poi-category').value;
          const city = document.getElementById('poi-city').value;

          const params = new URLSearchParams();
          if (query) params.append('query', query);
          if (category) params.append('category', category);
          if (city) params.append('city', city);
          params.append('limit', '20');

          try {
            const res = await fetch(API_BASE + '/pois?' + params.toString());
            const { data } = await res.json();

            const container = document.getElementById('pois-results');
            if (!data || data.length === 0) {
              container.innerHTML =
                '<p class="text-gray-500 col-span-full text-center py-8">No POIs found</p>';
              return;
            }

            container.innerHTML = data
              .map(
                (poi) =>
                  '<div class="border rounded-lg p-4 hover:shadow-md transition-shadow">' +
                  '<h3 class="font-semibold text-lg">' +
                  poi.name +
                  '</h3>' +
                  '<p class="text-sm text-gray-500">' +
                  poi.category +
                  '</p>' +
                  '<p class="text-sm mt-2">' +
                  (poi.address || 'No address') +
                  '</p>' +
                  (poi.rating_overall
                    ? '<p class="text-sm mt-1">⭐ ' +
                      poi.rating_overall.toFixed(1) +
                      '</p>'
                    : '') +
                  '<p class="text-xs text-gray-400 mt-2">Quality: ' +
                  ((poi.quality_score || 0) * 100).toFixed(0) +
                  '%</p>' +
                  '</div>'
              )
              .join('');
          } catch (error) {
            showToast('Failed to search POIs: ' + error.message, 'error');
          }
        }

        // Load training datasets
        async function loadDatasets() {
          try {
            const res = await fetch(API_BASE + '/training-datasets');
            const { data } = await res.json();

            const tbody = document.getElementById('datasets-table-body');
            if (!data || data.length === 0) {
              tbody.innerHTML =
                '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">No datasets found</td></tr>';
              return;
            }

            tbody.innerHTML = data
              .map(
                (ds) =>
                  '<tr class="hover:bg-gray-50">' +
                  '<td class="px-4 py-3 text-sm font-mono">' +
                  ds.id.slice(0, 8) +
                  '...</td>' +
                  '<td class="px-4 py-3 font-medium">' +
                  ds.name +
                  '</td>' +
                  '<td class="px-4 py-3">' +
                  ds.type +
                  '</td>' +
                  '<td class="px-4 py-3"><span class="status-' +
                  ds.status +
                  ' font-medium">' +
                  ds.status +
                  '</span></td>' +
                  '<td class="px-4 py-3">' +
                  (ds.statistics?.total_records || 0) +
                  '</td>' +
                  '<td class="px-4 py-3 text-sm text-gray-500">' +
                  new Date(ds.created_at).toLocaleString() +
                  '</td>' +
                  '</tr>'
              )
              .join('');
          } catch (error) {
            showToast('Failed to load datasets: ' + error.message, 'error');
          }
        }

        // Create job form submission
        document
          .getElementById('create-job-form')
          .addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);

            const categories = formData.get('categories');
            const cities = formData.get('cities');

            const payload = {
              name: formData.get('name'),
              platform: formData.get('platform'),
              job_type: formData.get('job_type'),
              schedule_cron: formData.get('schedule_cron') || undefined,
              config: {
                categories: categories
                  ? categories.split(',').map((c) => c.trim())
                  : undefined,
                geographic_scope: cities
                  ? { cities: cities.split(',').map((c) => c.trim()) }
                  : undefined,
                rate_limit: {
                  requests_per_second: parseFloat(
                    formData.get('rate_limit_rps')
                  ),
                  max_concurrent: parseInt(formData.get('max_concurrent')),
                },
              },
            };

            try {
              const res = await fetch(API_BASE + '/crawl-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });

              if (res.ok) {
                showToast('Job created successfully!');
                form.reset();
                // Switch to jobs tab
                document.querySelector('[data-tab="jobs"]').click();
                loadJobs();
              } else {
                const err = await res.json();
                showToast(err.message || 'Failed to create job', 'error');
              }
            } catch (error) {
              showToast('Failed to create job: ' + error.message, 'error');
            }
          });

        // Initial load
        checkHealth();
        loadJobs();

        // Refresh health every 30 seconds
        setInterval(checkHealth, 30000);
      </script>
    </body>
  </html>
`;

// GET /dashboard - Serve the dashboard page
dashboardRouter.get('/', (c: Context) => {
  return c.html(dashboardHTML);
});
