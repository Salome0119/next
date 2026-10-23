export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getProfessionLabel(profession: string): string {
  const professions: Record<string, string> = {
    'desarrollador': 'Desarrollador',
    'disenador': 'Diseñador',
    'project-manager': 'Project Manager',
    'estudiante': 'Estudiante',
    'otro': 'Otro',
  };
  return professions[profession] || profession;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-ES').format(num);
}

export function getMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(Number(year), Number(monthNum) - 1);
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
}