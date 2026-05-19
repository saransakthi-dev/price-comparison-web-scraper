import google.generativeai as genai
import os

class AIService:
    def __init__(self):
        self.model = None

    def _initialize(self):
        if self.model:
            return
        api_key = os.environ.get("GOOGLE_API_KEY")
        if api_key:
            try:
                genai.configure(api_key=api_key)
                
                # Fetch available models from API
                available_models = []
                try:
                    available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
                    print(f"DEBUG: Available models from API: {available_models}")
                except Exception as e:
                    print(f"DEBUG: Could not list models: {e}")

                # Priorities based on common names and experimental versions seen
                priorities = [
                    'gemini-1.5-flash',
                    'gemini-2.0-flash',
                    'gemini-2.5-flash',
                    'gemini-3.0-flash',
                    'gemini-3-flash-preview',
                    'gemini-pro',
                    'gemini-1.5-pro'
                ]
                
                # Add "models/" prefix counterparts
                full_priorities = []
                for p in priorities:
                    full_priorities.append(p)
                    if not p.startswith('models/'):
                        full_priorities.append(f'models/{p}')

                # Create final target list: try available models first, then common names
                # Filter to only things that look like gemini
                gemini_available = [m for m in available_models if 'gemini' in m.lower()]
                target_list = gemini_available + [p for p in full_priorities if p not in gemini_available]
                
                for model_name in target_list:
                    try:
                        print(f"DEBUG: Verifying model: {model_name}")
                        test_model = genai.GenerativeModel(model_name)
                        # Minimal test call
                        response = test_model.generate_content("ping", generation_config={"max_output_tokens": 1})
                        if response:
                            self.model = test_model
                            self.model_name = model_name
                            print(f"AI Service successfully locked on: {model_name}")
                            break
                    except Exception as e:
                        # Log specific failure for visibility in debug
                        print(f"DEBUG: {model_name} unavailable: {str(e)[:50]}...")
                        continue
                
                if not self.model:
                    print("AI Service: FAILED to verify any usable model.")
            except Exception as e:
                print(f"AI Service initialization failed: {e}")

    def get_product_verdict(self, product_name, current_price, history_summary, metrics):
        """
        Generates a natural language verdict using Gemini
        """
        self._initialize()
        if not self.model:
            return "AI Insight unavailable. Please set GOOGLE_API_KEY."

        prompt = f"""
        You are a Price Intelligence Expert. Analyze the following product data:
        Product: {product_name}
        Current Price: ₹{current_price}
        Historical Data Summary: {history_summary}
        Analytics Metrics: {metrics}

        Provide a concise (2-3 sentences) verdict on whether the user should buy this now or wait. 
        Mention the predicted trend and any 'fake discount' warnings.
        Be professional and data-driven.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error generating AI insight: {str(e)}"

ai_service = AIService()
