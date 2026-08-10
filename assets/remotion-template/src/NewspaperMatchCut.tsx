import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {zColor} from '@remotion/zod-types';

export const newspaperMatchCutSchema = z.object({
  keyword: z.string().min(1),
  kicker: z.string(),
  topic: z.string(),
  headlineTemplates: z
    .array(
      z.string().min(1).refine(
        (value) => value.split('{{keyword}}').length === 2,
        'Each headline must contain exactly one {{keyword}} marker'
      )
    )
    .min(1)
    .max(24),
  bodyParagraphs: z.array(z.string().min(1)).min(1).max(24),
  seed: z.string(),
  accentColor: zColor(),
  paperColor: zColor(),
  inkColor: zColor(),
  cutIntervalFrames: z.number().int().min(2).max(12),
  settleFrame: z.number().int().min(12).max(240),
  focusY: z.number().min(0.25).max(0.7),
  blurMin: z.number().min(0).max(20),
  blurMax: z.number().min(0).max(40),
  focusScale: z.number().min(0.5).max(1.8)
});

type Props = z.infer<typeof newspaperMatchCutSchema>;
type Edition = {
  readonly font: string;
  readonly weight: number;
  readonly size: number;
  readonly focusTemplate: string;
  readonly body: string;
  readonly columns: number;
  readonly align: 'left' | 'center' | 'right';
  readonly paper: string;
  readonly texture: string;
  readonly articleLeft: number;
  readonly articleTop: number;
  readonly articleWidth: number;
  readonly pageScale: number;
};

const EDITIONS: readonly Edition[] = [
  {font: 'Arial, Helvetica, sans-serif', weight: 760, size: 0.073, focusTemplate: '{{topic}} the skills behind a successful {{keyword}}', body: 'In the corporate world, an effective professional must connect people, systems, and decisions without losing sight of the human context. The work combines research, communication, judgment, and careful preparation. As organizations adopt new tools, the role continues to evolve, but its central responsibility remains clear: turn complex information into action that clients and colleagues can understand.', columns: 2, align: 'left', paper: '#e8e5da', texture: 'fibrous-white.png', articleLeft: 18, articleTop: 18, articleWidth: 74, pageScale: 1.01},
  {font: 'Georgia, Times New Roman, serif', weight: 700, size: 0.064, focusTemplate: 'The evolving role of an {{keyword}} in modern work', body: 'The modern workplace asks professionals to operate across disciplines that once remained separate. They interpret evidence, coordinate specialists, and communicate choices to people with different priorities. This broader mandate rewards clarity and adaptability. It also makes trust essential, because every recommendation must be supported by sound reasoning and an honest account of uncertainty.', columns: 3, align: 'center', paper: '#eeeade', texture: 'soft-gray.png', articleLeft: 5, articleTop: 28, articleWidth: 96, pageScale: 1.04},
  {font: 'Impact, Arial Narrow Bold, sans-serif', weight: 700, size: 0.075, focusTemplate: 'Technological advances reshape a digital {{keyword}}\u2019s work', body: 'New tools influence how teams collect information, test ideas, and communicate results. Automation can accelerate routine tasks, yet meaningful work still depends on context, verification, and responsible judgment. The strongest practitioners use technology to extend their capabilities rather than conceal weak reasoning, keeping people informed about both the opportunities and the limits of each system.', columns: 2, align: 'left', paper: '#dfddd4', texture: 'aged-cream.png', articleLeft: 9, articleTop: 23, articleWidth: 104, pageScale: 1.03},
  {font: 'Baskerville, Palatino Linotype, serif', weight: 700, size: 0.068, focusTemplate: 'The evolution of the {{keyword}} in modern organizations', body: 'A close reading of recent changes reveals a profession shaped by growing complexity. Clients expect faster answers, broader expertise, and more transparent decisions. Meeting those expectations requires disciplined research as well as the ability to explain why a particular course of action makes sense. The profession advances when speed and novelty are balanced by accountability.', columns: 3, align: 'right', paper: '#ece8dc', texture: 'halftone-light.png', articleLeft: 2, articleTop: 34, articleWidth: 108, pageScale: 1.02},
  {font: 'Avenir Next Condensed, Arial Narrow, sans-serif', weight: 800, size: 0.072, focusTemplate: 'What makes a successful {{keyword}} in a changing world', body: 'Preparation begins with understanding the question before searching for an answer. A successful practitioner separates evidence from assumption, listens closely to the people affected, and presents options in language that supports a real decision. These habits are not dramatic, but together they create reliable work and relationships that can withstand uncertainty.', columns: 2, align: 'center', paper: '#e6e2d6', texture: 'halftone-aged.png', articleLeft: 15, articleTop: 20, articleWidth: 82, pageScale: 1.05},
  {font: 'Courier New, Courier, monospace', weight: 700, size: 0.061, focusTemplate: 'Inside the {{keyword}} file: decisions, systems, and trust', body: 'Documents from the field show how ordinary decisions accumulate into lasting outcomes. Each record captures a question, the evidence available at the time, and the reasoning used to move forward. Read together, they reveal that dependable work is rarely the product of one insight. It emerges from a repeatable process of checking facts, comparing alternatives, and communicating consequences.', columns: 3, align: 'left', paper: '#e3dfd2', texture: 'crumpled-white.png', articleLeft: 12, articleTop: 31, articleWidth: 90, pageScale: 1.0}
];

export const DEFAULT_HEADLINE_TEMPLATES = EDITIONS.map((edition) => edition.focusTemplate);
export const DEFAULT_BODY_PARAGRAPHS = EDITIONS.map((edition) => edition.body);

const PAPER_TEXTURE = `url("${staticFile('paper-fiber.svg')}")`;
const hash = (value: string): number => {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const between = (key: string, min: number, max: number) => min + (hash(key) / 0xffffffff) * (max - min);

const centerWithin = (node: HTMLElement, ancestor: HTMLElement) => {
  let x = node.offsetWidth / 2;
  let y = node.offsetHeight / 2;
  let current: HTMLElement | null = node;
  while (current && current !== ancestor) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  if (current !== ancestor) throw new Error('Keyword must be inside the measured newspaper page');
  return {x, y};
};

const EditorialContent: React.FC<{
  props: Props;
  edition: Edition;
  width: number;
  focusParts: readonly [string, string];
  body: string;
  keywordRef?: React.RefObject<HTMLSpanElement | null>;
  showKeyword: boolean;
}> = ({props, edition, width, focusParts, body, keywordRef, showKeyword}) => {
  const articleFontSize = width * edition.size;
  return (
    <>
      <div style={{position: 'absolute', left: '17%', top: '11%', font: `600 ${width * 0.022}px Arial, sans-serif`, letterSpacing: '0.04em'}}>
        {props.kicker}
      </div>
      <article
        style={{
          position: 'absolute',
          left: `${edition.articleLeft}%`,
          top: `${edition.articleTop}%`,
          width: `${edition.articleWidth}%`,
          textAlign: edition.align,
          fontFamily: edition.font,
          fontWeight: edition.weight,
          fontSize: articleFontSize,
          lineHeight: 1.02
        }}
      >
        <div>
          <span>{focusParts[0]}</span>
          <span
            ref={showKeyword ? keywordRef : undefined}
            aria-hidden={showKeyword ? undefined : true}
            style={{
              display: 'inline-block',
              backgroundColor: showKeyword ? props.accentColor : 'transparent',
              color: showKeyword ? props.inkColor : 'transparent',
              padding: '0.07em 0.14em 0.10em'
            }}
          >
            {props.keyword}
          </span>
          <span>{focusParts[1]}</span>
        </div>
        <div
          style={{
            width: '100%',
            marginTop: '1.45em',
            columnCount: edition.columns,
            columnGap: width * 0.035,
            fontFamily: edition.font.includes('Arial') || edition.font.includes('Avenir') ? 'Arial, sans-serif' : 'Georgia, serif',
            fontSize: width * 0.025,
            fontWeight: 500,
            lineHeight: 1.3,
            textAlign: 'justify'
          }}
        >
          {body}
        </div>
      </article>
    </>
  );
};

const AlignedEdition: React.FC<{
  props: Props;
  edition: Edition;
  editionIndex: number;
  headlineTemplate: string;
  body: string;
}> = ({props, edition, editionIndex, headlineTemplate, body}) => {
  const {width, height} = useVideoConfig();
  const pageRef = useRef<HTMLDivElement>(null);
  const keywordRef = useRef<HTMLSpanElement>(null);
  const [alignment, setAlignment] = useState<null | {dx: number; dy: number; originX: number; originY: number}>(null);

  useLayoutEffect(() => {
    if (!pageRef.current || !keywordRef.current) return;
    const {x: originX, y: originY} = centerWithin(keywordRef.current, pageRef.current);
    setAlignment({
      dx: width / 2 - originX,
      dy: height * props.focusY - originY,
      originX,
      originY
    });
  }, [height, props.focusY, width]);

  const editionDrift = between(`${props.seed}-${editionIndex}-scale`, -0.012, 0.012);
  const focusText = headlineTemplate.replace('{{topic}}', props.topic);
  const focusParts = focusText.split('{{keyword}}');
  if (focusParts.length !== 2) throw new Error('Each focusTemplate must contain exactly one {{keyword}} marker');
  const typedFocusParts = focusParts as [string, string];
  const mediumFilterId = `focus-medium-blur-${editionIndex}`;
  const strongFilterId = `focus-strong-blur-${editionIndex}`;
  const mediumBlurX = 0.45 + props.blurMin * 0.18;
  const mediumBlurY = 1.2 + props.blurMin * 1.1;
  const strongBlurX = 0.75 + props.blurMax * 0.28;
  const strongBlurY = 2.5 + props.blurMax * 1.8;
  const focusX = alignment?.originX ?? width / 2;
  const focusY = alignment?.originY ?? height * props.focusY;
  const sharpMask = `radial-gradient(ellipse 300px 125px at ${focusX}px ${focusY}px, black 0%, black 28%, rgba(0,0,0,0.90) 42%, rgba(0,0,0,0.58) 62%, rgba(0,0,0,0.22) 80%, transparent 100%)`;
  const mediumMask = `radial-gradient(ellipse 520px 340px at ${focusX}px ${focusY}px, black 0%, black 30%, rgba(0,0,0,0.92) 44%, rgba(0,0,0,0.72) 58%, rgba(0,0,0,0.42) 73%, rgba(0,0,0,0.15) 88%, transparent 100%)`;
  const outerMask = `radial-gradient(ellipse 520px 340px at ${focusX}px ${focusY}px, transparent 0%, transparent 32%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.32) 58%, rgba(0,0,0,0.60) 73%, rgba(0,0,0,0.84) 88%, black 100%)`;

  return (
    <>
      <svg aria-hidden="true" width="0" height="0" style={{position: 'absolute'}}>
        <defs>
          <filter id={mediumFilterId} x="-30%" y="-50%" width="160%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={`${mediumBlurX} ${mediumBlurY}`} />
          </filter>
          <filter id={strongFilterId} x="-40%" y="-80%" width="180%" height="260%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={`${strongBlurX} ${strongBlurY}`} />
          </filter>
        </defs>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: alignment ? alignment.dx : 0,
          top: alignment ? alignment.dy : 0,
          width,
          height,
          opacity: alignment ? 1 : 0
        }}
      >
        <div
          ref={pageRef}
          style={{
            position: 'absolute',
            inset: 0,
            color: props.inkColor,
            scale: alignment ? edition.pageScale * props.focusScale + editionDrift : 1,
            transformOrigin: alignment ? `${alignment.originX}px ${alignment.originY}px` : '50% 50%'
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              filter: `url(#${mediumFilterId})`,
              maskImage: mediumMask,
              WebkitMaskImage: mediumMask
            }}
          >
            <EditorialContent props={props} edition={edition} width={width} focusParts={typedFocusParts} body={body} showKeyword={false} />
          </div>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              filter: `url(#${strongFilterId})`,
              maskImage: outerMask,
              WebkitMaskImage: outerMask
            }}
          >
            <EditorialContent props={props} edition={edition} width={width} focusParts={typedFocusParts} body={body} showKeyword={false} />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              maskImage: sharpMask,
              WebkitMaskImage: sharpMask
            }}
          >
            <EditorialContent
              props={props}
              edition={edition}
              width={width}
              focusParts={typedFocusParts}
              body={body}
              keywordRef={keywordRef}
              showKeyword
            />
          </div>
        </div>
      </div>
    </>
  );
};

export const NewspaperMatchCut: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const activeFrame = Math.min(frame, props.settleFrame);
  const editionIndex = Math.floor(activeFrame / props.cutIntervalFrames);
  const edition = EDITIONS[editionIndex % EDITIONS.length];
  const headlineTemplate = props.headlineTemplates[editionIndex % props.headlineTemplates.length];
  const body = props.bodyParagraphs[editionIndex % props.bodyParagraphs.length];
  const editionTexture = staticFile(`backgrounds/${edition.texture}`);

  return (
    <AbsoluteFill style={{backgroundColor: edition.paper || props.paperColor, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundColor: edition.paper || props.paperColor,
          backgroundImage: `${PAPER_TEXTURE}, radial-gradient(circle at 44% 36%, rgba(255,255,255,0.18), transparent 52%), url("${editionTexture}")`,
          backgroundSize: '520px 520px, 100% 100%, cover',
          backgroundPosition: 'center, center, center',
          backgroundBlendMode: 'multiply, soft-light, normal'
        }}
      />
      <AlignedEdition
        key={editionIndex}
        props={props}
        edition={edition}
        editionIndex={editionIndex}
        headlineTemplate={headlineTemplate}
        body={body}
      />
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 180px rgba(41,35,25,0.14)',
          background: 'linear-gradient(100deg, transparent 22%, rgba(255,255,255,0.12) 48%, transparent 72%)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none'
        }}
      />
    </AbsoluteFill>
  );
};
