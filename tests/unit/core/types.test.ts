import { describe, it, expect } from 'vitest';
import { LogLevel, getLogLevelName, parseLogLevel } from '../../../src/core/types';

describe('LogLevel Enum', () => {
  it('DEBUG should be 0', () => {
    expect(LogLevel.DEBUG).toBe(0);
  });

  it('INFO should be 1', () => {
    expect(LogLevel.INFO).toBe(1);
  });

  it('WARN should be 2', () => {
    expect(LogLevel.WARN).toBe(2);
  });

  it('ERROR should be 3', () => {
    expect(LogLevel.ERROR).toBe(3);
  });

  it('NONE should be 4', () => {
    expect(LogLevel.NONE).toBe(4);
  });

  it('levels should be comparable', () => {
    expect(LogLevel.DEBUG < LogLevel.INFO).toBe(true);
    expect(LogLevel.INFO < LogLevel.WARN).toBe(true);
    expect(LogLevel.WARN < LogLevel.ERROR).toBe(true);
    expect(LogLevel.ERROR < LogLevel.NONE).toBe(true);
  });
});

describe('getLogLevelName', () => {
  it('should return DEBUG for LogLevel.DEBUG', () => {
    expect(getLogLevelName(LogLevel.DEBUG)).toBe('DEBUG');
  });

  it('should return INFO for LogLevel.INFO', () => {
    expect(getLogLevelName(LogLevel.INFO)).toBe('INFO');
  });

  it('should return WARN for LogLevel.WARN', () => {
    expect(getLogLevelName(LogLevel.WARN)).toBe('WARN');
  });

  it('should return ERROR for LogLevel.ERROR', () => {
    expect(getLogLevelName(LogLevel.ERROR)).toBe('ERROR');
  });

  it('should return NONE for LogLevel.NONE', () => {
    expect(getLogLevelName(LogLevel.NONE)).toBe('NONE');
  });

  it('should return UNKNOWN for invalid level', () => {
    expect(getLogLevelName(999 as LogLevel)).toBe('UNKNOWN');
  });
});

describe('parseLogLevel', () => {
  it('should parse DEBUG (case insensitive)', () => {
    expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
    expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
    expect(parseLogLevel('Debug')).toBe(LogLevel.DEBUG);
  });

  it('should parse INFO (case insensitive)', () => {
    expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
    expect(parseLogLevel('info')).toBe(LogLevel.INFO);
  });

  it('should parse WARN (case insensitive)', () => {
    expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
    expect(parseLogLevel('warn')).toBe(LogLevel.WARN);
  });

  it('should parse ERROR (case insensitive)', () => {
    expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
    expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
  });

  it('should parse NONE (case insensitive)', () => {
    expect(parseLogLevel('NONE')).toBe(LogLevel.NONE);
    expect(parseLogLevel('none')).toBe(LogLevel.NONE);
  });

  it('should return INFO for unknown level', () => {
    expect(parseLogLevel('UNKNOWN')).toBe(LogLevel.INFO);
    expect(parseLogLevel('invalid')).toBe(LogLevel.INFO);
    expect(parseLogLevel('')).toBe(LogLevel.INFO);
  });
});
