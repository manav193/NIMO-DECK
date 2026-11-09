import type { AIRecommendation } from '@nimo-deck/shared';
import type { GitHubClient } from '@nimo-deck/github';

export interface IssueConversionParams {
  recommendation: AIRecommendation;
  owner: string;
  repo: string;
  confirmConversion: boolean;
  githubClient: GitHubClient;
}

export class GitHubIssueConverter {
  /**
   * Converts an ACCEPTED AI Recommendation into a formal GitHub issue.
   * Mandates explicit user confirmation before executing any API call.
   */
  static async convertToIssue(params: IssueConversionParams): Promise<{
    issueNumber: number;
    issueUrl: string;
  }> {
    if (!params.confirmConversion) {
      throw new Error(
        'Explicit user confirmation required to create GitHub issue (confirmConversion: true).'
      );
    }

    const rec = params.recommendation;
    if (rec.status !== 'ACCEPTED') {
      throw new Error(
        `Only recommendations with status 'ACCEPTED' can be converted to GitHub issues. Current status: '${rec.status}'`
      );
    }

    const bodyLines: string[] = [
      `## 🤖 NIMO-DECK AI Recommendation: ${rec.title}`,
      '',
      `**Category:** \`${rec.category}\` | **Severity:** \`${rec.severity}\` | **Complexity:** \`${rec.complexity}\``,
      '',
      '### 💡 Reasoning',
      rec.reasoning,
      '',
      '### 🎯 Expected Benefits',
      rec.expectedBenefits,
      ''
    ];

    if (rec.evidence) {
      bodyLines.push('### 🔍 Verifiable Evidence', `\`\`\`\n${rec.evidence}\n\`\`\``, '');
    }

    if (rec.risks && rec.risks.length > 0) {
      bodyLines.push('### ⚠️ Potential Risks', ...rec.risks.map((r) => `- ${r}`), '');
    }

    if (rec.implementationSteps && rec.implementationSteps.length > 0) {
      bodyLines.push(
        '### 🛠️ Implementation Steps',
        ...rec.implementationSteps.map((s, i) => `${i + 1}. ${s}`),
        ''
      );
    }

    if (rec.acceptanceCriteria && rec.acceptanceCriteria.length > 0) {
      bodyLines.push(
        '### ✅ Acceptance Criteria',
        ...rec.acceptanceCriteria.map((c) => `- [ ] ${c}`),
        ''
      );
    }

    bodyLines.push(
      '---',
      `*Generated autonomously by [NIMO-DECK](https://github.com/manav193/NIMO-DECK) DECK INTELLIGENCE.*`
    );

    const issue = await params.githubClient.createIssue(params.owner, params.repo, {
      title: `[DECK-AI] ${rec.title}`,
      body: bodyLines.join('\n'),
      labels: ['nimo-deck', 'ai-recommendation', rec.category.toLowerCase().replace(/_/g, '-')]
    });

    return {
      issueNumber: issue.number,
      issueUrl: issue.htmlUrl
    };
  }
}
