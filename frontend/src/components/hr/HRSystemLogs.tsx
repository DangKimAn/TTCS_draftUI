import React, { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { fetchSystemLogs, toggleSystemLogAnomaly } from '../../services/hrService';
import { HRFeedback } from './hrShared';
import { useSocket } from '../../contexts/SocketContext';

interface SystemLog {
  logID: string;
  userID: string;
  action: string;
  entity: string;
  entityID: string | null;
  createdAt: string;
  statusCode: number | null;
  responseMessage: string | null;
  isAnomalous: boolean;
  user?: {
    username: string;
    email: string;
    linkAvatar?: string;
  };
}

export default function HRSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);
  const [anomalousLogs, setAnomalousLogs] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await fetchSystemLogs(200, 0, startDate || undefined, endDate || undefined);
      setLogs(data.logs || []);
      const anomalousIds = (data.logs || [])
        .filter((l: SystemLog) => l.isAnomalous)
        .map((l: SystemLog) => l.logID);
      setAnomalousLogs(new Set(anomalousIds));
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Không thể tải nhật ký hệ thống.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewLog = (newLog: SystemLog) => {
      // Prepend the new log to the list
      setLogs((prev) => {
        // Avoid duplicates if multiple events fire
        if (prev.some((log) => log.logID === newLog.logID)) {
          return prev;
        }
        return [newLog, ...prev].slice(0, 200); // keep max 200 to match limit
      });
    };

    socket.on('new_system_log', handleNewLog);

    return () => {
      socket.off('new_system_log', handleNewLog);
    };
  }, [socket]);

  const toggleAnomalous = async (logId: string) => {
    setAnomalousLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) newSet.delete(logId);
      else newSet.add(logId);
      return newSet;
    });

    try {
      await toggleSystemLogAnomaly(logId);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message });
      setAnomalousLogs((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(logId)) newSet.delete(logId);
        else newSet.add(logId);
        return newSet;
      });
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'POST': return '#10b981'; // green
      case 'PUT':
      case 'PATCH': return '#3b82f6'; // blue
      case 'DELETE': return '#ef4444'; // red
      case 'GET': return '#6b7280'; // gray
      default: return '#8b5cf6'; // purple
    }
  };

  return (
    <section className="employee-section">
      <style>{`
        .hr-log-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .hr-log-row:hover {
          background-color: #f1f5f9;
        }
        .hr-log-row.anomalous {
          background-color: #fca5a5 !important;
        }
        .hr-log-row.anomalous:hover {
          background-color: #f87171 !important;
        }
      `}</style>
      <div className="employee-section__header" style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="dashboard-panel__eyebrow">Quản trị hệ thống</span>
          <h1>Nhật ký hệ thống</h1>
          <p>Lịch sử 200 thao tác gần nhất được hệ thống ghi nhận. Click vào một dòng để đánh dấu bất thường.</p>
        </div>
        <div className="employee-section__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="date" 
            className="dashboard-input" 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
          <span style={{color: '#64748b'}}>-</span>
          <input 
            type="date" 
            className="dashboard-input" 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
          <button
            type="button"
            className="dashboard-button dashboard-button--secondary"
            onClick={loadLogs}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'icon-spin' : ''} />
            Lọc & Làm mới
          </button>
        </div>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="dashboard-panel">
        <div className="dashboard-panel__content p-0">
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Hành động</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      Chưa có dữ liệu nhật ký.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isSuccess = log.statusCode && log.statusCode >= 200 && log.statusCode < 300;
                    const statusColor = isSuccess ? '#10b981' : '#ef4444';
                    
                    return (
                      <tr 
                        key={log.logID}
                        className={`hr-log-row ${anomalousLogs.has(log.logID) ? 'anomalous' : ''}`}
                        onClick={() => toggleAnomalous(log.logID)}
                      >
                        {/* 1. Người dùng */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                color: '#64748b'
                              }}
                            >
                              {log.user?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{log.user?.username || 'Hệ thống'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.user?.email || 'N/A'}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Hành động + Route (Entity) */}
                        <td style={{ maxWidth: '300px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: getActionColor(log.action), fontSize: '0.8rem', textTransform: 'uppercase' }}>
                              {log.action}
                            </span>
                            <span style={{ fontWeight: 500, wordBreak: 'break-all', fontSize: '0.9rem', lineHeight: '1.4' }}>
                              {log.entity}
                            </span>
                          </div>
                          {log.entityID && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>
                              ID: {log.entityID.split('-')[0]}...
                            </div>
                          )}
                        </td>

                        {/* 3. Trạng thái (Màu chữ xanh/đỏ) */}
                        <td style={{ maxWidth: '250px' }}>
                          <div style={{ color: statusColor, fontWeight: 500 }}>
                            <strong style={{ fontSize: '1.1em', marginRight: '4px' }}>
                              {log.statusCode || '???'}
                            </strong>
                            <span style={{ fontSize: '0.85rem' }}>
                              {log.responseMessage || 'Không có phản hồi'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Thời gian */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}
