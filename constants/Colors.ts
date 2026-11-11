// Same keys in both palettes. Extra keys beyond the base set:
//  field / fieldDisabled: form field border and disabled background; gray: tertiary text;
//  onPrimary: icon/text on a primary-colored fill; okText / badText / warnText: status text colors that stay readable on `surface`.
const light = {
  background: '#F4F7FC',
  surface: '#FFFFFF',
  text: '#1F2A3D',
  secondaryText: '#5D6B82',
  primary: '#1F5EFF',
  tint: '#1F5EFF',
  icon: '#6D7B93',
  tabIconDefault: '#97A3B8',
  tabIconSelected: '#1F5EFF',
  border: '#E2E8F3',
  success: '#1E8E5A',
  warning: '#C78513',
  danger: '#D64545',
  field: '#C9D2E3',
  fieldDisabled: '#F4F6FA',
  gray: '#7B7D7F',
  onPrimary: '#FFFFFF',
  okText: '#17754A',
  badText: '#B83232',
  warnText: '#8F5B00',
};

export type Palette = { [K in keyof typeof light]: string };

const dark: Palette = {
  background: '#0E1522',
  surface: '#172033',
  text: '#E8EDF7',
  secondaryText: '#9DAAC0',
  primary: '#7AA2FF',
  tint: '#7AA2FF',
  icon: '#8C99B0',
  tabIconDefault: '#6B7890',
  tabIconSelected: '#7AA2FF',
  border: '#2A364C',
  success: '#3CC48A',
  warning: '#E0A63A',
  danger: '#F27A7A',
  field: '#3A4760',
  fieldDisabled: '#1D283D',
  gray: '#8A97AD',
  onPrimary: '#0E1522',
  okText: '#4AD197',
  badText: '#FF8A8A',
  warnText: '#E8B04A',
};

export const Colors: { light: Palette; dark: Palette } = { light, dark };
