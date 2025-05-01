
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Trash, FileText, CheckSquare, Square } from 'lucide-react';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}

export const AdminTodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data since we don't have a todos table yet
  useEffect(() => {
    // In a real implementation, this would fetch from the database
    const mockTodos: TodoItem[] = [
      {
        id: '1',
        title: 'Implement Payment Processing',
        description: 'Integrate Stripe payment processing for subscription plans',
        isCompleted: false,
        priority: 'high',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Email Verification System',
        description: 'Add email verification for new user registrations',
        isCompleted: false,
        priority: 'medium',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Export Reports as PDF',
        description: 'Add functionality to export financial reports as PDF documents',
        isCompleted: true,
        priority: 'low',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Database Optimization',
        description: 'Optimize database queries for better performance',
        isCompleted: false,
        priority: 'medium',
        createdAt: new Date().toISOString()
      }
    ];
    
    setTodos(mockTodos);
  }, []);
  
  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) {
      toast.error('Task title is required');
      return;
    }
    
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      title: newTodoTitle.trim(),
      description: newTodoDescription.trim(),
      isCompleted: false,
      priority: newTodoPriority,
      createdAt: new Date().toISOString()
    };
    
    setTodos([...todos, newTodo]);
    setNewTodoTitle('');
    setNewTodoDescription('');
    setNewTodoPriority('medium');
    toast.success('Task added successfully');
  };
  
  const handleToggleComplete = (id: string) => {
    setTodos(prevTodos => prevTodos.map(todo => {
      if (todo.id === id) {
        const isCompleted = !todo.isCompleted;
        return {
          ...todo,
          isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : undefined
        };
      }
      return todo;
    }));
    toast.success('Task status updated');
  };
  
  const handleDeleteTodo = (id: string) => {
    setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    toast.success('Task deleted successfully');
  };
  
  const priorityClassMap = {
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200'
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admin To-Do List</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Add New Task
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Task Title*</label>
              <Input 
                placeholder="Enter task title..." 
                value={newTodoTitle}
                onChange={e => setNewTodoTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input 
                placeholder="Enter task description..." 
                value={newTodoDescription}
                onChange={e => setNewTodoDescription(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <div className="flex gap-4">
                {(['low', 'medium', 'high'] as const).map(priority => (
                  <div key={priority} className="flex items-center">
                    <input
                      type="radio"
                      id={`priority-${priority}`}
                      checked={newTodoPriority === priority}
                      onChange={() => setNewTodoPriority(priority)}
                      className="mr-2"
                    />
                    <label htmlFor={`priority-${priority}`} className="capitalize">
                      {priority}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <Button
              onClick={handleAddTodo}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Open Tasks</h3>
        
        {todos.filter(todo => !todo.isCompleted).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No open tasks. All caught up!</p>
            </CardContent>
          </Card>
        ) : (
          todos
            .filter(todo => !todo.isCompleted)
            .map(todo => (
              <Card key={todo.id} className="hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Checkbox 
                        checked={todo.isCompleted} 
                        onCheckedChange={() => handleToggleComplete(todo.id)}
                        id={`todo-${todo.id}`}
                      />
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <label 
                          htmlFor={`todo-${todo.id}`}
                          className="text-base font-medium cursor-pointer"
                        >
                          {todo.title}
                        </label>
                        <span className={`text-xs px-2 py-1 rounded-full border ${priorityClassMap[todo.priority]}`}>
                          {todo.priority}
                        </span>
                      </div>
                      
                      {todo.description && (
                        <p className="text-muted-foreground text-sm mt-1">
                          {todo.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Added {new Date(todo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-red-600"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
        
        {todos.filter(todo => todo.isCompleted).length > 0 && (
          <>
            <h3 className="text-lg font-semibold mt-6">Completed Tasks</h3>
            
            {todos
              .filter(todo => todo.isCompleted)
              .map(todo => (
                <Card key={todo.id} className="hover:shadow-sm transition-all opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Checkbox 
                          checked={todo.isCompleted} 
                          onCheckedChange={() => handleToggleComplete(todo.id)}
                          id={`todo-${todo.id}`}
                        />
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <label 
                            htmlFor={`todo-${todo.id}`}
                            className="text-base font-medium cursor-pointer line-through"
                          >
                            {todo.title}
                          </label>
                        </div>
                        
                        {todo.description && (
                          <p className="text-muted-foreground text-sm mt-1 line-through">
                            {todo.description}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed {todo.completedAt && new Date(todo.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-red-600"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            }
          </>
        )}
      </div>
    </div>
  );
};
