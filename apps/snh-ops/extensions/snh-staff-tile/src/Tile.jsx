import React from 'react';
import { Tile, reactExtension, useApi } from '@shopify/ui-extensions-react/point-of-sale';
// Smart-grid tile: one tap opens the SNH Staff panel.
const SnhTile = () => { const api = useApi(); return <Tile title="SNH Staff" subtitle="Elite points" onPress={() => api.action.presentModal()} enabled />; };
export default reactExtension('pos.home.tile.render', () => <SnhTile />);
