import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Employee, getDefaultPermissions } from '../types';
import { supabase } from '../lib/supabase';

// ── Context ───────────────────────────────────────────────────────────────────
interface AuthState {
  currentUser: Employee | null;
  employees: Employee[];
  login: (pin: string) => Employee | null;
  logout: () => void;
  updateEmployee: (emp: Employee) => void;
  addEmployee: (emp: Employee) => void;
  removeEmployee: (id: string) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('pos18_currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pos18_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pos18_currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('*');
      if (data) {
        setEmployees(data.map(emp => ({
          ...emp,
          joinDate: emp.join_date
        })));
      }
    };
    
    fetchEmployees();

    const sub = supabase.channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const login = useCallback((pin: string): Employee | null => {
    const user = employees.find(
      (e) => e.pin === pin.trim() && e.status === 'Aktif'
    );
    if (user) {
      setCurrentUser(user);
      return user;
    }
    return null;
  }, [employees]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const updateEmployee = useCallback(async (updated: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    setCurrentUser(prev => prev?.id === updated.id ? updated : prev);

    const dbPayload = {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      pin: updated.pin,
      status: updated.status,
      join_date: updated.joinDate,
      permissions: updated.permissions
    };
    await supabase.from('employees').update(dbPayload).eq('id', updated.id);
  }, []);

  const addEmployee = useCallback(async (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);

    const dbPayload = {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      pin: emp.pin,
      status: emp.status,
      join_date: emp.joinDate,
      permissions: emp.permissions
    };
    await supabase.from('employees').insert(dbPayload);
  }, []);

  const removeEmployee = useCallback(async (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    await supabase.from('employees').delete().eq('id', id);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, employees, login, logout, updateEmployee, addEmployee, removeEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthStore must be used inside AuthProvider');
  return ctx;
}
