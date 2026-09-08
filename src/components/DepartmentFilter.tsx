import React from 'react';
import { Department } from '../types';
import {
  Layers,
  Factory,
  Boxes,
  Truck,
  ShieldCheck,
  Wrench,
  Users,
  FileText,
  Users2
} from 'lucide-react';

interface DepartmentFilterProps {
  selectedDepartment: Department;
  onSelectDepartment: (dept: Department) => void;
  departmentCounts: Record<string, number>;
}

interface DeptConfig {
  name: Department;
  icon: React.ComponentType<{ className?: string }>;
}

const DEPARTMENTS_LIST: DeptConfig[] = [
  { name: 'Semua Departemen', icon: Layers },
  { name: 'Produksi Export', icon: Factory },
  { name: 'HA Export', icon: Truck },
  { name: 'VCFP Export', icon: Boxes },
  { name: 'QAM', icon: ShieldCheck },
  { name: 'Engineering', icon: Wrench },
  { name: 'Staff', icon: Users },
  { name: 'Administration', icon: FileText },
  { name: 'Human Resource', icon: Users2 },
];

export const DepartmentFilter: React.FC<DepartmentFilterProps> = ({
  selectedDepartment,
  onSelectDepartment,
  departmentCounts,
}) => {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/70 p-1.5 shadow-2xs">
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
        {DEPARTMENTS_LIST.map(({ name, icon: Icon }) => {
          const isSelected = selectedDepartment === name;
          const count = departmentCounts[name] || 0;

          return (
            <button
              key={name}
              type="button"
              onClick={() => onSelectDepartment(name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#1877F2] text-white font-semibold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#f0f2f5] font-normal'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
              <span>{name === 'Semua Departemen' ? 'FYP (Semua)' : name}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#f0f2f5] text-zinc-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
