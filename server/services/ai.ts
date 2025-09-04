class SocialMediaAnalyzer {
  private apiToken: string | null = null;

  constructor() {
    this.apiToken = process.env.HUGGINGFACE_API_TOKEN || null;
  }

  async analyzeMentionAuthenticity(mentionText: string, username: string): Promise<{
    authenticityScore: number;
    isSpam: boolean;
    qualityScore: number;
    reasoning: string;
  }> {
    if (!this.apiToken) {
      throw new Error('Hugging Face API not configured');
    }

    try {
      const prompt = `Analyze this social media mention of Gemlaunch for authenticity and quality. Consider tone, context, and whether it seems genuine or promotional.

Username: ${username}
Content: "${mentionText}"

Rate on these criteria:
- Authenticity (0-100): Does this seem like a genuine user experience vs promotional content?
- Quality (1-10): How thoughtful and valuable is this content?
- Spam detection: Does this look like bot/farm content?

Respond in JSON format:
{
  "authenticityScore": number (0-100),
  "isSpam": boolean,
  "qualityScore": number (1-10),
  "reasoning": "brief explanation of assessment"
}`;

      const response = await fetch(
        "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
        {
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 300,
              temperature: 0.1,
              return_full_text: false
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status}`);
      }

      const result = await response.json();
      const generatedText = Array.isArray(result) ? result[0]?.generated_text : result.generated_text;
      
      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      return {
        authenticityScore: Math.max(0, Math.min(100, analysis.authenticityScore || 50)),
        isSpam: analysis.isSpam || false,
        qualityScore: Math.max(1, Math.min(10, analysis.qualityScore || 5)),
        reasoning: analysis.reasoning || 'Analysis completed'
      };

    } catch (error) {
      console.error('Social media analysis error:', error);
      // Basic fallback analysis
      const hasSpamPatterns = /🚀{2,}|moon|pump|gem|100x/gi.test(mentionText);
      const isVeryShort = mentionText.length < 20;
      
      return {
        authenticityScore: hasSpamPatterns ? 20 : (isVeryShort ? 40 : 70),
        isSpam: hasSpamPatterns || isVeryShort,
        qualityScore: Math.min(8, Math.max(2, mentionText.length / 20)),
        reasoning: 'Basic pattern analysis due to AI service unavailable'
      };
    }
  }

  isConfigured(): boolean {
    return this.apiToken !== null;
  }
}

export const socialMediaAnalyzer = new SocialMediaAnalyzer();