import React from 'react';
import {Composition} from 'remotion';
import {GeneratedDocVideo} from './compositions/GeneratedDocVideo';
import {meta} from './generated/scene.generated';

export const Root: React.FC = () => {
  return (
    <Composition
      id="GeneratedDocVideo"
      component={GeneratedDocVideo}
      durationInFrames={meta.durationInFrames}
      fps={meta.fps}
      width={meta.width}
      height={meta.height}
      defaultProps={{}}
    />
  );
};
