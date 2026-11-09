import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  mapOcrDataToProfile, 
  FIELD_DEFINITIONS 
} from './geminiOcrService.ts';
import { initialProfile } from '../data/mockData.ts';
import { ExtractedFieldData } from '../types/index.ts';

test('FIELD_DEFINITIONS covers all required candidate and academic fields', () => {
  assert.ok(FIELD_DEFINITIONS.student_name, 'student_name definition exists');
  assert.ok(FIELD_DEFINITIONS.roll_number, 'roll_number definition exists');
  assert.ok(FIELD_DEFINITIONS.passing_year, 'passing_year definition exists');
  assert.ok(FIELD_DEFINITIONS.percentage, 'percentage definition exists');
  assert.ok(FIELD_DEFINITIONS.board_or_university, 'board_or_university definition exists');
  assert.ok(FIELD_DEFINITIONS.date_of_birth, 'date_of_birth definition exists');
});

test('mapOcrDataToProfile correctly maps personal details from OCR result', () => {
  const ocrData: Record<string, ExtractedFieldData> = {
    student_name: { value: 'Rahul Kumar Sharma', confidence: 97, status: 'high' },
    date_of_birth: { value: '2005-08-20', confidence: 94, status: 'high' },
    gender: { value: 'Male', confidence: 98, status: 'high' },
    fathers_name: { value: 'Suresh Sharma', confidence: 91, status: 'high' },
    mothers_name: { value: 'Anita Sharma', confidence: 88, status: 'review' },
  };

  const updated = mapOcrDataToProfile(ocrData, 'Class 12 Marksheet', initialProfile);

  assert.equal(updated.personalInfo?.fullName, 'Rahul Kumar Sharma');
  assert.equal(updated.personalInfo?.dob, '2005-08-20');
  assert.equal(updated.personalInfo?.gender, 'Male');
  assert.equal(updated.personalInfo?.fathersName, 'Suresh Sharma');
  assert.equal(updated.personalInfo?.mothersName, 'Anita Sharma');
});

test('mapOcrDataToProfile correctly updates Class 12 academic metrics', () => {
  const ocrData: Record<string, ExtractedFieldData> = {
    board_or_university: { value: 'CBSE New Delhi', confidence: 99, status: 'high' },
    school_or_college: { value: 'Springdales School', confidence: 95, status: 'high' },
    roll_number: { value: '12-998877', confidence: 96, status: 'high' },
    passing_year: { value: '2024', confidence: 85, status: 'review' },
    percentage: { value: '92.6%', confidence: 94, status: 'high' },
    subjects: { value: 'Physics, Chemistry, Mathematics, English, Computer Science', confidence: 90, status: 'high' },
  };

  const updated = mapOcrDataToProfile(ocrData, 'Class 12 Marksheet', initialProfile);

  assert.equal(updated.academicInfo?.class12.board, 'CBSE New Delhi');
  assert.equal(updated.academicInfo?.class12.schoolName, 'Springdales School');
  assert.equal(updated.academicInfo?.class12.rollNumber, '12-998877');
  assert.equal(updated.academicInfo?.class12.passingYear, 2024);
  assert.equal(updated.academicInfo?.class12.percentage, 92.6);
  assert.deepEqual(updated.academicInfo?.class12.subjects, [
    'Physics',
    'Chemistry',
    'Mathematics',
    'English',
    'Computer Science',
  ]);
});

test('mapOcrDataToProfile correctly targets Class 10 when document is Class 10 marksheet', () => {
  const ocrData: Record<string, ExtractedFieldData> = {
    board_or_university: { value: 'CBSE', confidence: 98, status: 'high' },
    roll_number: { value: '10-445566', confidence: 97, status: 'high' },
    passing_year: { value: '2022', confidence: 95, status: 'high' },
    percentage: { value: '95.2', confidence: 92, status: 'high' },
    marks_obtained: { value: '476', confidence: 93, status: 'high' },
    maximum_marks: { value: '500', confidence: 99, status: 'high' },
  };

  const updated = mapOcrDataToProfile(ocrData, 'Class 10 Marksheet & Passing Certificate', initialProfile);

  assert.equal(updated.academicInfo?.class10.board, 'CBSE');
  assert.equal(updated.academicInfo?.class10.rollNumber, '10-445566');
  assert.equal(updated.academicInfo?.class10.passingYear, 2022);
  assert.equal(updated.academicInfo?.class10.percentage, 95.2);
  assert.equal(updated.academicInfo?.class10.obtainedMarks, 476);
  assert.equal(updated.academicInfo?.class10.maxMarks, 500);
});
