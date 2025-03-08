import axios from 'axios';

export class ValTownService {
  private readonly valUrl: string;
  private readonly reactUrl: string;

  constructor() {
    this.valUrl = 'https://ajax-helloworldreactval.web.val.run/';
    this.reactUrl = 'https://esm.town/v/ajax/helloWorldReactVal';
  }

  async fetchValData(): Promise<any> {
    try {
      console.error('Fetching data from val.town...');
      const [htmlResponse, reactResponse] = await Promise.all([
        axios.get(this.valUrl, {
          headers: { 'Accept': 'text/html' },
        }),
        axios.get(this.reactUrl)
      ]);

      console.error('Val.town HTML response:', htmlResponse.data);
      console.error('Val.town React code:', reactResponse.data);

      return {
        html: htmlResponse.data,
        reactCode: reactResponse.data,
        url: this.valUrl,
        message: 'Hello, World! 👋' // The message rendered by the React app
      };
    } catch (error) {
      console.error('Error fetching from val.town:', error);
      throw error;
    }
  }
}
