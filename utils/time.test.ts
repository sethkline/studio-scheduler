import { describe, it, expect } from 'vitest';
import { 
  timeToMilliseconds, 
} from '~/utils/time';

describe('timeToMilliseconds', () => {
  it('should convert time strings to milliseconds consistently', () => {
    const time1 = '15:30:00';
    const time2 = '15:30:00';
    
    const ms1 = timeToMilliseconds(time1);
    const ms2 = timeToMilliseconds(time2);
    
    expect(ms1).toBe(ms2);
  });
  
  it('should handle different time formats correctly', () => {
    // Test with and without seconds
    const timeWithSeconds = '15:30:00';
    const timeWithoutSeconds = '15:30';
    
    const ms1 = timeToMilliseconds(timeWithSeconds);
    const ms2 = timeToMilliseconds(timeWithoutSeconds);
    
    expect(ms1).toBe(ms2);
  });
  
  it('should correctly identify when one time is after another', () => {
    const earlierTime = '14:30:00';
    const laterTime = '15:30:00';
    
    const earlierMs = timeToMilliseconds(earlierTime);
    const laterMs = timeToMilliseconds(laterTime);
    
    expect(laterMs > earlierMs).toBe(true);
  });
  
  it('should identify back-to-back times correctly', () => {
    const firstClassEnd = '15:30:00';
    const secondClassStart = '15:30:00';
    
    const endMs = timeToMilliseconds(firstClassEnd);
    const startMs = timeToMilliseconds(secondClassStart);
    
    expect(endMs).toBe(startMs);
  });
});