import type { YoutubeA1Lesson, YoutubeCourseStage } from '../../types/youtubeCourse';
import { YOUTUBE_A1_LESSONS_PART_1 } from './lessonsPart1';
import { YOUTUBE_A1_LESSONS_PART_2 } from './lessonsPart2';
import { YOUTUBE_A1_LESSONS_PART_3 } from './lessonsPart3';
import { YOUTUBE_A1_LESSONS_PART_4 } from './lessonsPart4';

export const CORE_A1_LESSON_COUNT = 64;

export const YOUTUBE_COURSE_STAGES: YoutubeCourseStage[] = [
  {
    id: 'stage-1',
    title: 'Stage 1 · First Words & Basics',
    subtitle: 'Greetings, phrases, numbers 0–100, alphabet & introductions',
    lessonRange: 'Lessons 1–8',
  },
  {
    id: 'stage-2',
    title: 'Stage 2 · Sentences & Core Verbs',
    subtitle: 'Word order, pronouns, haben/sein, regular & irregular verbs',
    lessonRange: 'Lessons 9–16',
  },
  {
    id: 'stage-3',
    title: 'Stage 3 · Articles, Time & Family',
    subtitle: 'Adjectives, der/die/das, ein/kein, telling time & possessives',
    lessonRange: 'Lessons 17–25',
  },
  {
    id: 'stage-4',
    title: 'Stage 4 · Accusative, Modals & Dative',
    subtitle: 'Accusative case, möchten, W-questions, café & dative intro',
    lessonRange: 'Lessons 26–32',
  },
  {
    id: 'stage-5',
    title: 'Stage 5 · Daily Life & Imperative',
    subtitle: 'Ordinals, dates, dative pronouns, separable verbs & directions',
    lessonRange: 'Lessons 33–40',
  },
  {
    id: 'stage-6',
    title: 'Stage 6 · Past Tense (Perfekt) & Shopping',
    subtitle: 'war/hatte, inseparable verbs, Perfekt (haben/sein) & supermarket',
    lessonRange: 'Lessons 41–48',
  },
  {
    id: 'stage-7',
    title: 'Stage 7 · Real-Life Situations',
    subtitle: 'Weather, appointments, emails, likes, clothes & taxi',
    lessonRange: 'Lessons 49–56',
  },
  {
    id: 'stage-8',
    title: 'Stage 8 · Official A1 Tasks & Final Test',
    subtitle: 'Phone calls, doctor, forms, post office, bank, housing & A1 test',
    lessonRange: 'Lessons 57–64 + Bonus',
  },
];

export const YOUTUBE_A1_LESSONS: YoutubeA1Lesson[] = [
  ...YOUTUBE_A1_LESSONS_PART_1,
  ...YOUTUBE_A1_LESSONS_PART_2,
  ...YOUTUBE_A1_LESSONS_PART_3,
  ...YOUTUBE_A1_LESSONS_PART_4,
];
