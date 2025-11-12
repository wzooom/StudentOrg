import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Committee, Task } from '../types';
import { PermissionLevel } from '../types';
import api from '../lib/api';
import KanbanBoard from '../components/committees/KanbanBoard';

interface CommitteeMember {
  id: string;
  name: string;
  email: string;
}

export default function CommitteePage() {
  const { id } = useParams();
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  useEffect(() => {
    loadCommittee();
  }, [id]);

  const loadCommittee = async () => {
    try {
      const [committeeRes, tasksRes] = await Promise.all([
        api.get(`/committees/${id}`),
        api.get(`/tasks/committee/${id}`),
      ]);
      setCommittee(committeeRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Failed to load committee:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCommitteeMembers = (): CommitteeMember[] => {
    if (!committee?.permissions) return [];

    const members: CommitteeMember[] = [];
    const memberIds = new Set<string>();

    committee.permissions.forEach((permission: any) => {
      if (permission.permissionLevel !== PermissionLevel.NONE && permission.role?.userRoles) {
        permission.role.userRoles.forEach((userRole: any) => {
          if (userRole.user && !memberIds.has(userRole.user.id)) {
            memberIds.add(userRole.user.id);
            members.push({
              id: userRole.user.id,
              name: userRole.user.name,
              email: userRole.user.email,
            });
          }
        });
      }
    });

    return members.sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tasks', {
        title,
        description,
        committeeId: id,
        assigneeIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
      });
      setTitle('');
      setDescription('');
      setSelectedAssignees([]);
      setShowCreateTask(false);
      loadCommittee();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!committee) {
    return <div className="text-center mt-8">Committee not found</div>;
  }

  const isLeader = committee.userPermission === PermissionLevel.LEADER;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{committee.name}</h1>
            {committee.description && (
              <p className="text-gray-600 mt-2">{committee.description}</p>
            )}
          </div>
          {isLeader && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {showCreateTask && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <form onSubmit={handleCreateTask}>
            <h3 className="text-lg font-medium mb-3">Create New Task</h3>
            <input
              type="text"
              placeholder="Task title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              placeholder="Task description (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to (optional)
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                {getCommitteeMembers().length === 0 ? (
                  <p className="text-sm text-gray-500">No members available</p>
                ) : (
                  <div className="space-y-2">
                    {getCommitteeMembers().map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(member.id)}
                          onChange={() => toggleAssignee(member.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-900">{member.name}</span>
                        <span className="text-xs text-gray-500">({member.email})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedAssignees.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAssignees.length} assignee{selectedAssignees.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateTask(false);
                  setTitle('');
                  setDescription('');
                  setSelectedAssignees([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <KanbanBoard
        committeeId={id!}
        tasks={tasks}
        userPermission={committee.userPermission || PermissionLevel.NONE}
        onTaskUpdate={loadCommittee}
      />
    </div>
  );
}
