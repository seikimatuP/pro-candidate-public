/**
 * アプリケーション全体で利用する入力検証ユーティリティ
 * 簡素化されたバリデーション機能を提供
 */

/**
 * 入力検証ユーティリティクラス
 */
class ValidationUtils {
  /**
   * 年度の妥当性を検証
   * @param year 検証する年度
   * @returns 有効な場合true
   */
  isValidYear(year: any): boolean {
    if (typeof year !== 'string') return false;
    return /^\d{4}$/.test(year);
  }

  /**
   * URLの妥当性を検証
   * @param url 検証するURL
   * @returns 有効な場合true
   */
  isValidUrl(url: any): boolean {
    if (typeof url !== 'string') return false;
    try {
      const urlObj = new URL(url);
      return /^https?:$/.test(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * メールアドレスの妥当性を検証
   * @param email 検証するメールアドレス
   * @returns 有効な場合true
   */
  isValidEmail(email: any): boolean {
    if (typeof email !== 'string') return false;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }

  /**
   * シート名の妥当性を検証
   * @param sheetName 検証するシート名
   * @returns 有効な場合true
   */
  isValidSheetName(sheetName: any): boolean {
    if (typeof sheetName !== 'string') return false;
    if (sheetName.length === 0 || sheetName.length > 100) return false;
    return !/[\\\/\?\*\[\]]/.test(sheetName);
  }

  /**
   * HTMLサニタイズ
   * @param input サニタイズする文字列
   * @returns サニタイズされた文字列
   */
  sanitizeInput(input: any): string {
    if (typeof input !== 'string') return '';
    
    return input
      // スクリプトタグを削除
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // 危険な属性を削除
      .replace(/on\w+=/gi, '')
      .replace(/javascript:/gi, '')
      // SQLインジェクションのパターンを削除
      .replace(/drop\s+table/gi, '')
      .replace(/--/g, '');
  }

  /**
   * 選手データの妥当性を検証
   * @param playerData 検証する選手データ
   * @returns 有効な場合true
   */
  validatePlayerData(playerData: any): boolean {
    if (!playerData || typeof playerData !== 'object') return false;
    
    const { name, school, position, filingDate } = playerData;
    
    // 必須フィールドのチェック
    if (!name || typeof name !== 'string' || name.trim() === '') return false;
    if (!school || typeof school !== 'string' || school.trim() === '') return false;
    if (!position || !this.isValidPosition(position)) return false;
    if (!filingDate || !this.isValidDate(filingDate)) return false;
    
    return true;
  }

  /**
   * ポジションの妥当性を検証
   * @param position 検証するポジション
   * @returns 有効な場合true
   */
  isValidPosition(position: any): boolean {
    if (typeof position !== 'string') return false;
    const validPositions = ['pitcher', 'catcher', 'infielder', 'outfielder'];
    return validPositions.includes(position);
  }

  /**
   * 日付フォーマットの妥当性を検証 (YYYY-MM-DD)
   * @param date 検証する日付
   * @returns 有効な場合true
   */
  isValidDate(date: any): boolean {
    if (typeof date !== 'string') return false;
    
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) return false;
    
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    return dateObj.getFullYear() === year &&
           dateObj.getMonth() === month - 1 &&
           dateObj.getDate() === day;
  }
}

// シングルトンインスタンス
const validationUtils = new ValidationUtils();

export default validationUtils;
export { validationUtils, ValidationUtils };