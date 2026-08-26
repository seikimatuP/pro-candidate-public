import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseHighschoolData, parseUniversityData } from '../../pro-candidate-aws/lambda/scraping';

// Load HTML fixtures using absolute path from project root
const highschoolHtml = readFileSync(
  join(process.cwd(), 'tests/fixtures/high_school_sample.html'),
  'utf-8'
);
const universityHtml = readFileSync(
  join(process.cwd(), 'tests/fixtures/university_sample.html'),
  'utf-8'
);

describe('Scraping Parser Integration Tests', () => {
  describe('parseHighschoolData', () => {
    it('should parse highschool players from real HTML fixture', () => {
      const players = parseHighschoolData(highschoolHtml, 2024);

      expect(players).toHaveLength(3);

      // Verify first player
      expect(players[0].name).toBe('山田太郎');
      expect(players[0].school).toBe('サンプル高校');
      expect(players[0].prefecture).toBe('東京都');
      expect(players[0].type).toBe('highschool');
      expect(players[0].year).toBe(2024);
      expect(players[0].isDraftEligible).toBe(true);
      expect(players[0].id).toMatch(/^highschool_2024_\d{4}$/);

      // Verify second player
      expect(players[1].name).toBe('佐藤次郎');
      expect(players[1].school).toBe('テスト高校');
      expect(players[1].prefecture).toBe('大阪府');

      // Verify third player
      expect(players[2].name).toBe('鈴木三郎');
      expect(players[2].school).toBe('北海道高校');
      expect(players[2].prefecture).toBe('北海道');
    });

    it('should generate unique IDs for each player', () => {
      const players = parseHighschoolData(highschoolHtml, 2024);
      const ids = players.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(players.length);
    });

    it('should handle empty HTML gracefully', () => {
      const emptyHtml = '<html><body><p>No table here</p></body></html>';
      const players = parseHighschoolData(emptyHtml, 2024);

      expect(players).toHaveLength(0);
    });

    it('should include timestamps for each player', () => {
      const players = parseHighschoolData(highschoolHtml, 2024);

      players.forEach(player => {
        expect(player.createdAt).toBeDefined();
        expect(player.updatedAt).toBeDefined();
        expect(new Date(player.createdAt).getTime()).not.toBeNaN();
      });
    });
  });

  describe('parseUniversityData', () => {
    it('should parse university players from real HTML fixture', () => {
      const players = parseUniversityData(universityHtml, 2024);

      expect(players).toHaveLength(2);

      // Verify first player
      expect(players[0].name).toBe('山田太郎(ヤマダタロウ)');
      expect(players[0].school).toBe('サンプル大学');
      expect(players[0].region).toBe('関東');
      expect(players[0].type).toBe('university');
      expect(players[0].year).toBe(2024);
      expect(players[0].isDraftEligible).toBe(true);
      expect(players[0].id).toMatch(/^university_2024_\d{4}$/);

      // Verify second player
      expect(players[1].name).toBe('佐藤次郎(サトウジロウ)');
      expect(players[1].school).toBe('テスト大学');
      expect(players[1].region).toBe('関西');
    });

    it('should include all player metadata', () => {
      const players = parseUniversityData(universityHtml, 2024);

      players.forEach(player => {
        expect(player).toHaveProperty('id');
        expect(player).toHaveProperty('name');
        expect(player).toHaveProperty('school');
        expect(player).toHaveProperty('type');
        expect(player).toHaveProperty('year');
        expect(player).toHaveProperty('region');
        expect(player).toHaveProperty('isDraftEligible');
        expect(player).toHaveProperty('createdAt');
        expect(player).toHaveProperty('updatedAt');
      });
    });

    it('should handle empty HTML gracefully', () => {
      const emptyHtml = '<html><body><p>No table here</p></body></html>';
      const players = parseUniversityData(emptyHtml, 2024);

      expect(players).toHaveLength(0);
    });

    it('should generate sequential IDs', () => {
      const players = parseUniversityData(universityHtml, 2024);

      expect(players[0].id).toBe('university_2024_0001');
      expect(players[1].id).toBe('university_2024_0002');
    });
  });

  describe('Parser Comparison', () => {
    it('should use different ID formats for highschool vs university', () => {
      const hsPlayers = parseHighschoolData(highschoolHtml, 2024);
      const univPlayers = parseUniversityData(universityHtml, 2024);

      hsPlayers.forEach(p => expect(p.id).toContain('highschool_'));
      univPlayers.forEach(p => expect(p.id).toContain('university_'));
    });

    it('should both set isDraftEligible to true', () => {
      const hsPlayers = parseHighschoolData(highschoolHtml, 2024);
      const univPlayers = parseUniversityData(universityHtml, 2024);

      hsPlayers.forEach(p => expect(p.isDraftEligible).toBe(true));
      univPlayers.forEach(p => expect(p.isDraftEligible).toBe(true));
    });
  });
});
