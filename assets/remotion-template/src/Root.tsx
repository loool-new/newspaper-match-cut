import {Composition} from 'remotion';
import {
  DEFAULT_BODY_PARAGRAPHS,
  DEFAULT_BODY_PARAGRAPHS_ZH,
  DEFAULT_HEADLINE_TEMPLATES,
  DEFAULT_HEADLINE_TEMPLATES_ZH,
  NewspaperMatchCut,
  newspaperMatchCutSchema
} from './NewspaperMatchCut';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="NewspaperMatchCut"
      component={NewspaperMatchCut}
      schema={newspaperMatchCutSchema}
      width={__WIDTH__}
      height={__HEIGHT__}
      fps={__FPS__}
      durationInFrames={__DURATION__}
      defaultProps={{
        language: "__LANGUAGE__",
        keyword: "__KEYWORD__",
        kicker: "__KICKER__",
        topic: "__TOPIC__",
        headlineTemplates: __HEADLINE_TEMPLATES__,
        bodyParagraphs: __BODY_PARAGRAPHS__,
        seed: "edition-01",
        accentColor: "#e8ef39",
        paperColor: "#e8e5da",
        inkColor: "#171714",
        timingMode: "__TIMING_MODE__",
        beatFrames: __BEAT_FRAMES__,
        audioSrc: "__AUDIO_SRC__",
        audioDurationSeconds: __AUDIO_DURATION__,
        cutIntervalFrames: 4,
        settleFrame: 58,
        focusY: 0.44,
        blurMin: 1.05,
        blurMax: 4.4,
        focusScale: 1
      }}
    />
  );
};
