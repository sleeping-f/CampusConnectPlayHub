import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './StudyGroups.css';

// If you already have an AuthContext, you can replace these props with context
export default function StudyGroups({ me }) {
  // me: { id, role, firstName, lastName, campus_id } – pass from your context if available

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null); // { group, members: [] }
  const isStudent = me?.role === 'student';

  const api = useMemo(() => ({
    list: async (q) => {
      const params = new URLSearchParams();
      if (q?.trim()) params.set('q', q.trim());
      const { data } = await axios.get(`/api/study-groups?${params.toString()}`);
      return data.groups;
    },
    mine: async () => {
      const { data } = await axios.get('/api/study-groups/mine');
      return data.groups;
    },
    create: async (payload) => {
      const { data } = await axios.post('/api/study-groups', payload);
      return data.group;
    },
    removeGroup: async (groupId) => {
      const { data } = await axios.delete(`/api/study-groups/${groupId}`);
      return data;
    },
    members: async (groupId) => {
      const { data } = await axios.get(`/api/study-group-memberships/${groupId}/members`);
      return data.members;
    },
    join: async (groupId) => {
      const { data } = await axios.post('/api/study-group-memberships/join', { group_id: groupId });
      return data;
    },
    leave: async (groupId) => {
      const { data } = await axios.delete('/api/study-group-memberships/leave', { data: { group_id: groupId } });
      return data;
    },
    kick: async (groupId, studentId) => {
      const { data } = await axios.delete(`/api/study-group-memberships/${groupId}/members/${studentId}`);
      return data;
    },
  }), []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.list(query);
      setGroups(data);
    } catch (e) {
      console.error('Load groups error:', e);
      alert('Failed to load study groups');
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

  const openGroup = async (g) => {
    setSelected({ group: g, members: null });
    try {
      const members = await api.members(g.id);
      setSelected({ group: g, members });
    } catch (e) {
      console.error('Load members error:', e);
      alert('Failed to load members');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isStudent) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      group_name: form.get('group_name'),
      description: form.get('description'),
    };
    try {
      const newGroup = await api.create(payload);
      setGroups(prev => [newGroup, ...prev]);
      e.currentTarget.reset();
    } catch (err) {
      console.error('Create group error:', err?.response?.data || err);
      alert(err?.response?.data?.message || 'Failed to create group');
    }
  };

  const handleJoin = async (groupId) => {
    try {
      await api.join(groupId);
      if (selected?.group?.id === groupId) {
        const members = await api.members(groupId);
        setSelected(s => ({ ...s, members }));
      }
      load();
    } catch (e) {
      console.error('Join error:', e);
      alert(e?.response?.data?.message || 'Failed to join');
    }
  };

  const handleLeave = async (groupId) => {
    try {
      await api.leave(groupId);
      if (selected?.group?.id === groupId) {
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
      alert(e?.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleKick = async (groupId, studentId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      await api.kick(groupId, studentId);
      const members = await api.members(groupId);
      setSelected(s => ({ ...s, members }));
      load();
    } catch (e) {
      console.error('Kick error:', e);
      alert(e?.response?.data?.message || 'Failed to remove member');
    }
  };

  const isMember = (g) => {
    // Rough heuristic: if selected has me, or if the UI wants simple button logic, we’d ideally ask backend.
    // For now, show Leave if I appear in selected.members; else Join.
    if (selected?.group?.id === g.id && selected.members) {
      return selected.members.some(m => m.student_id === me?.id);
    }
    return false;
  };

  const isCreator = (g) => g.creator_id === me?.id;

  return (
    <div className="study-groups">
      <div className="sg-header">
        <h2>Study Groups</h2>
        <input
          className="sg-search"
          placeholder="Search groups..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isStudent && (
        <form className="sg-create" onSubmit={handleCreate}>
          <h3>Create a Group</h3>
          <div className="sg-form-row">
            <input name="group_name" placeholder="Group name" required minLength={2} maxLength={255} />
          </div>
          <div className="sg-form-row">
            <textarea name="description" placeholder="Description (optional)" maxLength={2000} />
          </div>
          <button type="submit" className="btn primary">Create</button>
        </form>
      )}

      <div className="sg-layout">
        <div className="sg-list">
          {loading && <div className="sg-empty">Loading…</div>}
          {!loading && groups.length === 0 && <div className="sg-empty">No groups found</div>}

          {groups.map((g) => (
            <div
              key={g.id}
              className={`sg-card ${selected?.group?.id === g.id ? 'active' : ''}`}
              onClick={() => openGroup(g)}
            >
              <div className="sg-card-top">
                <div>
                  <div className="sg-name">{g.group_name}</div>
                  {g.description && <div className="sg-desc">{g.description}</div>}
                </div>
                <div className="sg-meta">
                  <div className="sg-meta-line">Members: {g.member_count}</div>
                  <div className="sg-meta-line">
                    Creator: {g.firstName} {g.lastName} <span className="sg-campus">({g.campus_id || 'N/A'})</span>
                  </div>
                  <div className="sg-actions">
                    {isCreator(g) ? (
                      <button
                        className="btn danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                      >Delete</button>
                    ) : isStudent && (
                      isMember(g) ? (
                        <button
                          className="btn"
                          onClick={(e) => { e.stopPropagation(); handleLeave(g.id); }}
                        >Leave</button>
                      ) : (
                        <button
                          className="btn primary"
                          onClick={(e) => { e.stopPropagation(); handleJoin(g.id); }}
                        >Join</button>
                      )
                    )}
                  </div>
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
                    Creator: {selected.group.firstName} {selected.group.lastName}{' '}
                    <span className="sg-campus">({selected.group.campus_id || 'N/A'})</span>
                  </div>
                </div>
                <div className="sg-actions">
                  {isCreator(selected.group) ? (
                    <button className="btn danger" onClick={() => handleDelete(selected.group.id)}>Delete</button>
                  ) : isStudent && (
                    isMember(selected.group) ? (
                      <button className="btn" onClick={() => handleLeave(selected.group.id)}>Leave</button>
                    ) : (
                      <button className="btn primary" onClick={() => handleJoin(selected.group.id)}>Join</button>
                    )
                  )}
                </div>
              </div>

              <div className="sg-members">
                <h4>Members</h4>
                {!selected.members && <div className="sg-empty">Loading members…</div>}
                {selected.members && selected.members.length === 0 && (
                  <div className="sg-empty">No members yet</div>
                )}
                {selected.members && selected.members.map((m) => (
                  <div key={m.student_id} className="sg-member">
                    <div className="sg-member-info">
                      <div className="sg-member-name">{m.firstName} {m.lastName}</div>
                      <div className="sg-member-sub">
                        <span>{m.email}</span>
                        <span className="sg-campus">ID: {m.campus_id || 'N/A'}</span>
                      </div>
                    </div>
                    {(isCreator(selected.group) || m.student_id === me?.id) && (
                      <button
                        className="btn small"
                        onClick={() => handleKick(selected.group.id, m.student_id)}
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