// // app/admin/error-logs/page.tsx
// // Simple All-in-One Error Logs Dashboard

// 'use client';

// import { useState, useEffect } from 'react';

// interface ErrorLog {
//   id: number;
//   errorType: string;
//   errorMessage: string;
//   stackTrace: string | null;
//   requestData: any;
//   createdAt: string;
// }

// // Helper function to format time ago
// function timeAgo(date: string): string {
//   const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
//   if (seconds < 60) return 'just now';
//   if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
//   if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
//   if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
//   return new Date(date).toLocaleDateString();
// }

// export default function CarrierServiceErrorLogs() {
//   const [errors, setErrors] = useState<ErrorLog[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState({
//     total: 0,
//     last24h: 0,
//     mostCommon: ''
//   });
//   const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
//   const [filterType, setFilterType] = useState('');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);

//   // Fetch errors
//   useEffect(() => {
//     fetchErrors();
//     // fetchStats();
//   }, [page, filterType]);

//   const fetchErrors = async () => {
//     setLoading(true);
//     try {
//       let url = `/api/errors?action=list&page=${page}&limit=50`;
//       if (filterType) url += `&errorType=${filterType}`;

//       const res = await fetch(url);
//       const data = await res.json();
      
//       if (data.success) {
//         setErrors(data.errors);
//         setTotalPages(data.pagination.totalPages);
//       }
//     } catch (err) {
//       console.error('Failed to fetch errors:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getBadgeColor = (type: string) => {
//     const colors: { [key: string]: string } = {
//       TIMEOUT: 'bg-yellow-100 text-yellow-800',
//       API_ERROR: 'bg-red-100 text-red-800',
//       VALIDATION_ERROR: 'bg-orange-100 text-orange-800',
//       PROCESSING_ERROR: 'bg-purple-100 text-purple-800',
//       UNKNOWN: 'bg-gray-100 text-gray-800'
//     };
//     return colors[type] || 'bg-gray-100 text-gray-800';
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-8">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900">Error Logs</h1>
//           <p className="text-gray-600 mt-1">Monitor and analyze application errors</p>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//           <div className="bg-white p-6 rounded-lg shadow">
//             <div className="text-sm text-gray-600">Total Errors (7d)</div>
//             <div className="text-3xl font-bold text-gray-900 mt-2">
//               {stats.total.toLocaleString()}
//             </div>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <div className="text-sm text-gray-600">Last 24 Hours</div>
//             <div className="text-3xl font-bold text-orange-600 mt-2">
//               {stats.last24h.toLocaleString()}
//             </div>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <div className="text-sm text-gray-600">Most Common Type</div>
//             <div className="text-xl font-bold text-gray-900 mt-2">
//               {stats.mostCommon}
//             </div>
//           </div>
//         </div>

//         {/* Filters */}
//         <div className="bg-white p-4 rounded-lg shadow mb-6">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <select
//               value={filterType}
//               onChange={(e) => {
//                 setFilterType(e.target.value);
//                 setPage(1);
//               }}
//               className="px-3 py-2 border rounded-md"
//             >
//               <option value="">All Error Types</option>
//               <option value="TIMEOUT">Timeout</option>
//               <option value="API_ERROR">API Error</option>
//               <option value="VALIDATION_ERROR">Validation Error</option>
//               <option value="PROCESSING_ERROR">Processing Error</option>
//               <option value="UNKNOWN">Unknown</option>
//             </select>

//             <button
//               onClick={() => {
//                 fetchErrors();
//                 // fetchStats();
//               }}
//               className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//             >
//               Refresh
//             </button>
//           </div>
//         </div>

//         {/* Error Table */}
//         <div className="bg-white rounded-lg shadow overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="min-w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {loading ? (
//                   <tr>
//                     <td colSpan={5} className="px-6 py-12 text-center">
//                       <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                     </td>
//                   </tr>
//                 ) : errors.length === 0 ? (
//                   <tr>
//                     <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
//                       No errors found
//                     </td>
//                   </tr>
//                 ) : (
//                   errors.map((error) => (
//                     <tr key={error.id} className="hover:bg-gray-50">
//                       <td className="px-6 py-4 text-sm">#{error.id}</td>
//                       <td className="px-6 py-4">
//                         <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeColor(error.errorType)}`}>
//                           {error.errorType}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 text-sm max-w-md truncate">
//                         {error.errorMessage}
//                       </td>
//                       <td className="px-6 py-4 text-sm text-gray-500">
//                         {timeAgo(error.createdAt)}
//                       </td>
//                       <td className="px-6 py-4 text-sm">
//                         <button
//                           onClick={() => setSelectedError(error)}
//                           className="text-blue-600 hover:text-blue-900 font-medium"
//                         >
//                           View
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination */}
//           {totalPages > 1 && (
//             <div className="px-6 py-4 border-t flex items-center justify-between">
//               <div className="text-sm text-gray-700">
//                 Page {page} of {totalPages}
//               </div>
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => setPage(p => Math.max(1, p - 1))}
//                   disabled={page === 1}
//                   className="px-4 py-2 border rounded-md text-sm disabled:opacity-50"
//                 >
//                   Previous
//                 </button>
//                 <button
//                   onClick={() => setPage(p => Math.min(totalPages, p + 1))}
//                   disabled={page === totalPages}
//                   className="px-4 py-2 border rounded-md text-sm disabled:opacity-50"
//                 >
//                   Next
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Error Detail Modal */}
//         {selectedError && (
//           <div
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
//             onClick={() => setSelectedError(null)}
//           >
//             <div
//               className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="px-6 py-4 border-b flex justify-between items-center">
//                 <h3 className="text-lg font-semibold">Error #{selectedError.id}</h3>
//                 <button
//                   onClick={() => setSelectedError(null)}
//                   className="text-gray-400 hover:text-gray-600"
//                 >
//                   ✕
//                 </button>
//               </div>

//               <div className="px-6 py-4 space-y-4">
//                 <div>
//                   <div className="text-sm font-medium text-gray-700 mb-1">Type</div>
//                   <span className={`px-3 py-1 text-sm rounded-full ${getBadgeColor(selectedError.errorType)}`}>
//                     {selectedError.errorType}
//                   </span>
//                 </div>

//                 <div>
//                   <div className="text-sm font-medium text-gray-700 mb-1">Message</div>
//                   <p className="text-sm bg-gray-50 p-3 rounded">{selectedError.errorMessage}</p>
//                 </div>

//                 <div>
//                   <div className="text-sm font-medium text-gray-700 mb-1">Time</div>
//                   <p className="text-sm">{new Date(selectedError.createdAt).toLocaleString()}</p>
//                 </div>

//                 {selectedError.stackTrace && (
//                   <div>
//                     <div className="text-sm font-medium text-gray-700 mb-1">Stack Trace</div>
//                     <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
// {selectedError.stackTrace}
//                     </pre>
//                   </div>
//                 )}

//                 {selectedError.requestData && (
//                   <div>
//                     <div className="text-sm font-medium text-gray-700 mb-1">Request Data</div>
//                     <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
// {JSON.stringify(selectedError.requestData, null, 2)}
//                     </pre>
//                   </div>
//                 )}
//               </div>

//               <div className="px-6 py-4 border-t flex justify-end">
//                 <button
//                   onClick={() => setSelectedError(null)}
//                   className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
// app/admin/error-logs/page.tsx
// Error Logs Dashboard with CSS Module

'use client';

import { useState, useEffect } from 'react';
// import styles from './error-logs.module.css';

interface ErrorLog {
  id: number;
  errorType: string;
  errorMessage: string;
  stackTrace: string | null;
  requestData: any;
  createdAt: string;
}

// Helper function to format time ago
function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(date).toLocaleDateString();
}

export default function CarrierServiceErrorLogs() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    last24h: 0,
    mostCommon: ''
  });
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch errors
  useEffect(() => {
    fetchErrors();
    fetchStats();
  }, [page, filterType]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      let url = `/api/errors?action=list&page=${page}&limit=50`;
      if (filterType) url += `&errorType=${filterType}`;

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        setErrors(data.errors);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch errors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/errors?action=stats&days=7');
      const data = await res.json();
      
      if (data.success) {
        setStats({
          total: data.stats.totalErrors,
          last24h: data.stats.recentErrors24h,
          mostCommon: data.stats.errorsByType[0]?.type || 'N/A'
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchErrors();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/errors?action=search&search=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      
      if (data.success) {
        setErrors(data.results);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (type: string) => {
    const classes: { [key: string]: string } = {
      TIMEOUT: "badgeTimeout",
      API_ERROR: "badgeApiError",
      VALIDATION_ERROR: "badgeValidationError",
      PROCESSING_ERROR: "badgeProcessingError",
      UNKNOWN: "badgeUnknown"
    };
    return `badge ${classes[type] || "badgeUnknown"}`;
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Header */}
        <div className="header">
          <h1 className="title">Error Logs</h1>
          <p className="subtitle">Monitor and analyze application errors</p>
        </div>

        {/* Stats Cards */}
        {/* <div className="statsGrid">
          <div className="statCard">
            <div className="statLabel">Total Errors (7d)</div>
            <div className="statValue">
              {stats.total.toLocaleString()}
            </div>
          </div>
          <div className="statCard">
            <div className="statLabel">Last 24 Hours</div>
            <div className="statValue statValueOrange">
              {stats.last24h.toLocaleString()}
            </div>
          </div>
          <div className="statCard">
            <div className="statLabel">Most Common Type</div>
            <div className="statValue" style={{ fontSize: '1.25rem' }}>
              {stats.mostCommon}
            </div>
          </div>
        </div> */}

        {/* Filters */}
        <div className="filterSection">
          <div className="filterGrid">
            {/* <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="select"
            >
              <option value="">All Error Types</option>
              <option value="TIMEOUT">Timeout</option>
              <option value="API_ERROR">API Error</option>
              <option value="VALIDATION_ERROR">Validation Error</option>
              <option value="PROCESSING_ERROR">Processing Error</option>
              <option value="UNKNOWN">Unknown</option>
            </select>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search errors..."
                className="input"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleSearch}
                className="button buttonPrimary"
              >
                Search
              </button>
            </div> */}

            <button
              onClick={() => {
                fetchErrors();
                fetchStats();
              }}
              className="button buttonSecondary"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Table */}
        <div className="tableContainer">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead className="tableHeader">
                <tr>
                  <th className="tableHeaderCell">ID</th>
                  <th className="tableHeaderCell">Type</th>
                  <th className="tableHeaderCell">Message</th>
                  <th className="tableHeaderCell">Time</th>
                  <th className="tableHeaderCell">Actions</th>
                </tr>
              </thead>
              <tbody className="tableBody">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="tableCell" style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="spinner"></div>
                    </td>
                  </tr>
                ) : errors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="emptyState">
                      No errors found
                    </td>
                  </tr>
                ) : (
                  errors.map((error) => (
                    <tr key={error.id} className="tableRow">
                      <td className="tableCell">#{error.id}</td>
                      <td className="tableCell">
                        <span className={getBadgeClass(error.errorType)}>
                          {error.errorType}
                        </span>
                      </td>
                      <td className={`tableCell truncate`}>
                        {error.errorMessage}
                      </td>
                      <td className="tableCell" style={{ color: '#6b7280' }}>
                        {timeAgo(error.createdAt)}
                      </td>
                      <td className="tableCell">
                        <button
                          onClick={() => setSelectedError(error)}
                          className="buttonLink"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="paginationInfo">
                Page {page} of {totalPages}
              </div>
              <div className="paginationButtons">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="button buttonOutline"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="button buttonOutline"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Detail Modal */}
        {selectedError && (
          <div
            className="modalOverlay"
            onClick={() => setSelectedError(null)}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modalHeader">
                <h3 className="modalTitle">Error #{selectedError.id}</h3>
                <button
                  onClick={() => setSelectedError(null)}
                  className="modalClose"
                >
                  ✕
                </button>
              </div>

              <div className="modalBody">
                <div className="detailSection">
                  <div className="detailLabel">Type</div>
                  <span className={getBadgeClass(selectedError.errorType)}>
                    {selectedError.errorType}
                  </span>
                </div>

                <div className="detailSection">
                  <div className="detailLabel">Message</div>
                  <p className="detailContent">{selectedError.errorMessage}</p>
                </div>

                <div className="detailSection">
                  <div className="detailLabel">Time</div>
                  <p style={{ fontSize: '0.875rem' }}>{new Date(selectedError.createdAt).toLocaleString()}</p>
                </div>

                {selectedError.stackTrace && (
                  <div className="detailSection">
                    <div className="detailLabel">Stack Trace</div>
                    <pre className="codeBlock">
{selectedError.stackTrace}
                    </pre>
                  </div>
                )}

                {selectedError.requestData && (
                  <div className="detailSection">
                    <div className="detailLabel">Request Data</div>
                    <pre className="detailContent" style={{ fontFamily: 'monospace' }}>
{JSON.stringify(selectedError.requestData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="modalFooter">
                <button
                  onClick={() => setSelectedError(null)}
                  className="button buttonSecondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}