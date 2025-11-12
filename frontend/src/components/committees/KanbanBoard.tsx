import { useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '../../types';
import { TaskStatus, PermissionLevel } from '../../types';
import TaskCard from './TaskCard';
import api from '../../lib/api';

interface KanbanBoardProps {
  committeeId: string;
  tasks: Task[];
  userPermission: PermissionLevel;
  onTaskUpdate: () => void;
}

interface DroppableColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  isLeader: boolean;
  committeeId: string;
  onUpdate: () => void;
}

function DroppableColumn({ id, title, tasks, isLeader, onUpdate }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className="bg-gray-100 rounded-lg p-4">
      <h3 className="font-semibold text-lg mb-4 text-gray-700">
        {title}
        <span className="ml-2 text-sm text-gray-500">
          ({tasks.length})
        </span>
      </h3>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px]">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isLeader={isLeader}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  userPermission,
  onTaskUpdate,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if we're dropping on a column (the over.id will be the column status)
    let newStatus: string | null = null;

    // If over.id is one of the TaskStatus values, use it
    if (over.id === TaskStatus.TODO || over.id === TaskStatus.IN_PROGRESS || over.id === TaskStatus.DONE) {
      newStatus = over.id;
    } else {
      // Otherwise, find which column the dropped task belongs to
      const droppedTask = tasks.find((t) => t.id === over.id);
      if (droppedTask) {
        newStatus = droppedTask.status;
      }
    }

    if (!newStatus || task.status === newStatus) return;

    try {
      await api.patch(`/tasks/${taskId}/status`, {
        status: newStatus,
      });
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const columns = [
    { id: TaskStatus.TODO, title: 'To Do', tasks: getTasksByStatus(TaskStatus.TODO) },
    { id: TaskStatus.IN_PROGRESS, title: 'In Progress', tasks: getTasksByStatus(TaskStatus.IN_PROGRESS) },
    { id: TaskStatus.DONE, title: 'Done', tasks: getTasksByStatus(TaskStatus.DONE) },
  ];

  const isLeader = userPermission === PermissionLevel.LEADER;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <DroppableColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={column.tasks}
            isLeader={isLeader}
            onUpdate={onTaskUpdate}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-indigo-500 opacity-90">
            <h4 className="font-medium">{activeTask.title}</h4>
            {activeTask.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activeTask.description}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
