export const positionLabels: Record<string, string> = {
  GOALKEEPER: 'Torwart',
  DEFENDER: 'Verteidiger',
  MIDFIELD: 'Mittelfeld',
  STRIKER: 'Stürmer',
}

export const positionBadgeVariant: Record<string, 'goalkeeper' | 'defender' | 'midfield' | 'striker'> = {
  GOALKEEPER: 'goalkeeper',
  DEFENDER: 'defender',
  MIDFIELD: 'midfield',
  STRIKER: 'striker',
}

export const positionTextColor: Record<string, string> = {
  GOALKEEPER: 'text-goalkeeper',
  DEFENDER: 'text-defender',
  MIDFIELD: 'text-midfield',
  STRIKER: 'text-striker',
}

export const positionDotColor: Record<string, string> = {
  GOALKEEPER: 'bg-goalkeeper',
  DEFENDER: 'bg-defender',
  MIDFIELD: 'bg-midfield',
  STRIKER: 'bg-striker',
}

export const positionEdgeColor: Record<string, string> = {
  GOALKEEPER: 'border-l-[3px] border-l-goalkeeper',
  DEFENDER: 'border-l-[3px] border-l-defender',
  MIDFIELD: 'border-l-[3px] border-l-midfield',
  STRIKER: 'border-l-[3px] border-l-striker',
}
