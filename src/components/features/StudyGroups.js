// StudyGroups.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './StudyGroups.css';

/**
 * StudyGroups UI
 * Expects `me` from context/props: { id, role, firstName, lastName, campus_id }
 */
export default function StudyGroups({ me }) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null); // { group, members: [] }
  const isStudent = me?.role === 'student';

  // API endpoints aligned with updated backend:
  // - study_groups.js  -> /api/study-groups
  // - memberships.js   -> /api/memberships
  const api = useMemo(() => ({
    list: async (q) => {
      const { data } = await axios.get('/api/study-groups', { params: q ? { q } : {} });
      // data = { groups: [...] }
      return (data?.groups || []).map(g => ({
        ...g,
        isMember: !!g.isMember,
      }));
    },
    create: async ({ name, description }) => {
      const { data } = await axios.post('/api/study-groups', { name, description });
      return data?.group;
    },
    mine: async () => {
      const { data } = await axios.get('/api/study-groups/mine');
      return data?.groups || [];
    },
    details: async (groupId) => {
      const { data } = await axios.get(`/api/study-groups/${groupId}`);
      return data;
    },
    join: async (groupId) => {
      const { data } = await axios.post(`/api/study-groups/${groupId}/join`);
      return data;
    },
    leave: async (groupId) => {
      const { data } = await axios.post(`/api/study-groups/${groupId}/leave`);
      return data;
    },
    members: async (groupId) => {
      const { data } = await axios.get(`/api/memberships/${groupId}/members`);
      return data?.members || [];
    },
    kick: async (groupId, studentId) => {
      const { data } = await axios.delete(`/api/memberships/${groupId}/members/${studentId}`);
      return data;
    },
    // wired to backend DELETE /api/study-groups/:groupId
    removeGroup: async (groupId) => {
      const { data } = await axios.delete(`/api/study-groups/${groupId}`);
      return data;
    }
  }), []);

  const load = async () => {
    setLoading(true);
    try {
      // pull list and my groups to compute creator flag
      const [data, mine] = await Promise.all([api.list(query), api.mine()]);
      const creatorSet = new Set(
        (mine || []).filter(g => g.myRole === 'creator').map(g => g.group_id)
      );
      const withFlags = (data || []).map(g => ({ ...g, isCreator: creatorSet.has(g.group_id) }));
      const sorted = withFlags.slice().sort((a, b) =>
        (a.group_name || '').localeCompare(b.group_name || '', undefined, { sensitivity: 'base' })
      );
      setGroups(sorted);
    } catch (e) {
      console.error('Load groups error:', e);
      alert(e?.response?.data?.message || 'Failed to load study groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // initial
  useEffect(() => {
    const t = setTimeout(load, 350); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [query]);

  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!form.name || form.name.trim().length < 2) return alert('Group name must be at least 2 characters');

    setCreating(true);
    try {
      const group = await api.create({ name: form.name.trim(), description: form.description?.trim() || null });
      setForm({ name: '', description: '' });
      await load();
      // auto-select the newly created group
      if (group?.group_id) {
        const details = await api.details(group.group_id);
        setSelected({ group: details.group, members: details.members });
      }
    } catch (e) {
      console.error('Create error:', e);
      alert(e?.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const openDetails = async (g) => {
    try {
      const { group, members } = await api.details(g.group_id);
      setSelected({ group, members });
    } catch (e) {
      console.error('Details error:', e);
      alert(e?.response?.data?.message || 'Failed to load group details');
    }
  };

  // auto-select joined group
  const handleJoin = async (groupId) => {
    try {
      await api.join(groupId);
      const { group, members } = await api.details(groupId);
      setSelected({ group, members });
      setGroups(prev => prev.map(g => (g.group_id === groupId ? { ...g, isMember: true } : g)));
    } catch (e) {
      console.error('Join error:', e);
      alert(e?.response?.data?.message || 'Failed to join');
    }
  };

  const handleLeave = async (groupId) => {
    try {
      await api.leave(groupId);
      if (selected?.group?.group_id === groupId) {
        const members = await api.members(groupId);
        setSelected(s => ({ ...s, members }));
      }
      load();
    } catch (e) {
      console.error('Leave error:', e);
      alert(e?.response?.data?.message || 'Failed to leave');
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Delete this study group?')) return;
    try {
      await api.removeGroup(groupId);
      setSelected(null);
      load();
    } catch (e) {
      console.error('Delete error:', e);
      alert(e?.response?.data?.message || e?.message || 'Failed to delete group');
    }
  };

  const handleKick = async (groupId, studentId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.kick(groupId, studentId);
      if (selected?.group?.group_id === groupId) {
        const members = await api.members(groupId);
        setSelected(s => ({ ...s, members }));
      }
    } catch (e) {
      console.error('Kick error:', e);
      alert(e?.response?.data?.message || 'Failed to remove member');
    }
  };

  // helpers
  const amMember = (g) => !!g.isMember;
  const isCreator = (members) => !!members?.some(m => m.student_id === me?.id && m.role === 'creator');
  const creatorMember = (members) => members?.find(m => m.role === 'creator');

  return (
    <div className="sg-wrap">
      <div className="sg-header">
        <h2>Study Groups</h2>
        <div className="sg-actions">
          <input
            className="sg-search"
            placeholder="Search groups..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isStudent && (
            <form onSubmit={handleCreate} className="sg-create">
              <input
                placeholder="New group name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <button className="btn primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="sg-main">
        <div className="sg-list">
          {loading && <div className="sg-loading">Loading...</div>}
          {!loading && groups.length === 0 && <div className="sg-empty">No groups found</div>}

          {!loading && groups.map(g => (
            <div key={g.group_id} className={`sg-card ${selected?.group?.group_id === g.group_id ? 'active' : ''}`}>
              <div className="sg-card-body" onClick={() => openDetails(g)}>
                <div className="sg-card-title">{g.group_name}</div>
                {g.description && <div className="sg-card-desc">{g.description}</div>}
                <div className="sg-card-meta">
                  {isStudent && (
                    <div className="sg-card-actions">
                      {g.isCreator ? (
                        <>
                          <button
                            className="btn"
                            onClick={(e) => { e.stopPropagation(); handleDelete(g.group_id); }}
                          >
                            Delete
                          </button>
                          <button
                            className="btn"
                            onClick={(e) => { e.stopPropagation(); handleLeave(g.group_id); }}
                          >
                            Leave
                          </button>
                        </>
                      ) : amMember(g) ? (
                        <button
                          className="btn"
                          onClick={(e) => { e.stopPropagation(); handleLeave(g.group_id); }}
                        >
                          Leave
                        </button>
                      ) : (
                        <button
                          className="btn primary"
                          onClick={(e) => { e.stopPropagation(); handleJoin(g.group_id); }}
                        >
                          Join
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sg-details">
          {!selected && <div className="sg-empty">Select a group to view details</div>}
          {selected && (
            <>
              <div className="sg-detail-header">
                <div>
                  <div className="sg-name">{selected.group.group_name}</div>
                  {selected.group.description && (
                    <div className="sg-desc">{selected.group.description}</div>
                  )}

                  <div className="sg-meta-line">
                    Creator:{' '}
                    {creatorMember(selected.members)
                      ? (
                        <>
                          {creatorMember(selected.members).firstName} {creatorMember(selected.members).lastName}
                          <span className="sg-campus"> ({creatorMember(selected.members).campus_id || 'N/A'})</span>
                        </>
                      )
                      : 'N/A'}
                  </div>

                  <div className="sg-meta-line">
                    Created at: {new Date(selected.group.date_created).toLocaleString()}
                  </div>
                </div>

                <div className="sg-detail-actions">
                  {isStudent && amMember({ isMember: selected.members?.some(m => m.student_id === me?.id) })}
                  {isStudent && isCreator(selected.members) && (
                    <button className="btn danger" onClick={() => handleDelete(selected.group.group_id)}>Delete</button>
                  )}
                </div>
              </div>

              <div className="sg-members">
                <div className="sg-members-title">Members</div>
                {selected.members?.map(m => (
                  <div key={m.student_id} className="sg-member">
                    <div className="sg-member-info">
                      <div className="sg-member-name">
                        {m.firstName} {m.lastName} {m.role === 'creator' ? <span className="badge">Creator</span> : null}
                      </div>
                      <div className="sg-member-meta">{m.email} · {m.campus_id || 'N/A'}</div>
                    </div>
                    {isCreator(selected.members) && (
                      <button
                        className={`btn ${m.student_id === me?.id ? '' : 'danger'}`}
                        onClick={() => (m.student_id === me?.id
                          ? handleLeave(selected.group.group_id)
                          : handleKick(selected.group.group_id, m.student_id))}
                        title={m.student_id === me?.id ? 'Leave group' : 'Remove member'}
                      >
                        {m.student_id === me?.id ? 'Leave' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}