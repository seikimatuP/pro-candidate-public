/**
 * 段階的デプロイを管理するクラス
 */
export class DeploymentManager {
  private deploymentStages: string[] = ['canary', 'staging', 'production'];
  private currentStageIndex = 0;

  /**
   * 現在のデプロイステージを取得
   * @returns 現在のステージ名
   */
  getCurrentStage(): string {
    return this.deploymentStages[this.currentStageIndex];
  }

  /**
   * 次のデプロイステージに進む
   * @throws エラー: 最終ステージに到達している場合
   */
  advanceToNextStage(): void {
    if (this.currentStageIndex >= this.deploymentStages.length - 1) {
      throw new Error('すでに最終ステージに到達しています');
    }
    this.currentStageIndex++;
    console.log(`デプロイステージが "${this.getCurrentStage()}" に進みました`);
  }

  /**
   * 現在のステージでデプロイを実行
   * @param deployFunction デプロイ処理を実行する関数
   */
  async deployCurrentStage(deployFunction: () => Promise<void>): Promise<void> {
    const stage = this.getCurrentStage();
    console.log(`"${stage}" ステージでデプロイを開始します...`);
    try {
      await deployFunction();
      console.log(`"${stage}" ステージでのデプロイが成功しました`);
    } catch (error) {
      console.error(`"${stage}" ステージでのデプロイ中にエラーが発生しました:`, error);
      throw error;
    }
  }
}
