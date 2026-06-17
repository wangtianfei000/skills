import React from 'react';
import {AbsoluteFill} from 'remotion';
import {GeneratedScene} from '../generated/scene.generated';

export const GeneratedDocVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#08111f'}}>
      <GeneratedScene />
    </AbsoluteFill>
  );
};
