import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Help() {
  // Set up tab functionality
  useEffect(() => {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    const handleTabClick = (event: Event) => {
      const button = event.currentTarget as HTMLElement;
      
      // Remove active class from all buttons and contents
      document.querySelectorAll('.tab-button').forEach(btn => 
        btn.classList.remove('active')
      );
      document.querySelectorAll('.tab-content').forEach(content => 
        content.classList.remove('active')
      );
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Show corresponding content
      const tabId = button.getAttribute('data-tab');
      if (tabId) {
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
          tabContent.classList.add('active');
        }
      }
    };
    
    // Add click event to all tab buttons
    tabButtons.forEach(button => {
      button.addEventListener('click', handleTabClick);
    });
    
    // Cleanup event listeners
    return () => {
      tabButtons.forEach(button => {
        button.removeEventListener('click', handleTabClick);
      });
    };
  }, []);

  return (
    <div className="container help-page">
      <h1>Apollo Help Center</h1>
      
      <section className="help-section">
        <h2>About Apollo's Smart Activity Tracking</h2>
        <p className="section-intro">
          Apollo uses AI to understand your natural language descriptions of food and activities.
          You can simply describe what you ate or did, and our system will automatically track the calories.
        </p>
        
        <div className="help-card">
          <h3>Two Ways to Log Activities</h3>
          
          <div className="logging-method">
            <h4>1. Natural Language (AI-Powered)</h4>
            <p>
              Just tell Apollo what you ate or what exercise you did in everyday language:
            </p>
            <ul>
              <li>"I ate a banana"</li>
              <li>"Went for a 5K run this morning"</li>
              <li>"Had a chicken sandwich for lunch"</li>
            </ul>
            <p>
              Our AI will analyze your text, identify the activity, and estimate the calories.
            </p>
          </div>
          
          <div className="logging-method">
            <h4>2. Structured Format (Always Available)</h4>
            <p>
              If you prefer precise control or if our AI service is temporarily unavailable,
              you can use the structured format:
            </p>
            <pre>item: [food/activity name], calories: [number], type: [consume/burn]</pre>
            <p>Examples:</p>
            <ul>
              <li><code>item: banana, calories: 105, type: consume</code></li>
              <li><code>item: 5K run, calories: 300, type: burn</code></li>
            </ul>
          </div>
          
          <p>
            Apollo will process your input, create a log entry, and add it to your daily log
            with the current timestamp.
          </p>
        </div>
      </section>

      <section className="help-section">
        <h2>Managing Your Logged Activities</h2>
        <p className="section-intro">
          Made a mistake or need to adjust something? Don't worry! Apollo makes it easy to manage 
          your logged activities.
        </p>
        
        <div className="help-card">
          <h3>Editing or Deleting Logged Activities</h3>
          <p>
            You can always edit or delete any activity after it's been logged. For each activity in your list, you'll see:
          </p>
          <ul>
            <li><strong>Edit Button</strong> (pencil icon) - Click to modify the activity name, calorie count, or type</li>
            <li><strong>Delete Button</strong> (trash icon) - Click to remove the activity from your log</li>
          </ul>
          <p>
            This is especially useful if:
          </p>
          <ul>
            <li>The AI estimated incorrect calories for your activity</li>
            <li>You want to adjust portion sizes after logging</li>
            <li>You need to change an activity from "consume" to "burn" or vice versa</li>
            <li>You want to make the activity name more specific</li>
          </ul>
          <p className="note">
            <strong>Pro Tip:</strong> Always double-check your entries and feel free to edit them anytime. 
            Your calorie totals and progress will automatically update when you make changes.
          </p>
        </div>
      </section>

      <section className="help-section">
        <h2>Tips for Effective Logging</h2>
        <div className="help-tabs">
          <div className="tab-headers">
            <button className="tab-button active" data-tab="food">
              <i className="material-icons">restaurant</i> Food
            </button>
            <button className="tab-button" data-tab="exercise">
              <i className="material-icons">fitness_center</i> Exercise
            </button>
          </div>
          
          <div className="tab-content active" id="food">
            <h3>Logging Food</h3>
            <div className="logging-examples">
              <div className="natural-language">
                <h4>Natural Language Examples:</h4>
                <ul>
                  <li>"I ate a banana"</li>
                  <li>"Had a chicken sandwich for lunch"</li>
                  <li>"Drank a cup of coffee with milk"</li>
                  <li>"Consumed a large pizza slice"</li>
                  <li>"Had 2 eggs and toast for breakfast"</li>
                </ul>
                <p className="note">
                  For more accurate tracking with AI, include details like portion sizes when possible.
                </p>
              </div>
              
              <div className="structured-format">
                <h4>Structured Format Examples:</h4>
                <ul>
                  <li><code>item: banana, calories: 105, type: consume</code></li>
                  <li><code>item: chicken sandwich, calories: 450, type: consume</code></li>
                  <li><code>item: coffee with milk, calories: 30, type: consume</code></li>
                  <li><code>item: large pizza slice, calories: 300, type: consume</code></li>
                  <li><code>item: eggs and toast, calories: 350, type: consume</code></li>
                </ul>
                <p className="note">
                  For accuracy with structured format, look up calorie values on food packaging or use a nutrition database.
                </p>
              </div>
            </div>
          </div>
          
          <div className="tab-content" id="exercise">
            <h3>Logging Exercise</h3>
            <div className="logging-examples">
              <div className="natural-language">
                <h4>Natural Language Examples:</h4>
                <ul>
                  <li>"I ran 5 kilometers"</li>
                  <li>"Walked for 45 minutes"</li>
                  <li>"Did 30 minutes of yoga"</li>
                  <li>"Biked to work today"</li>
                  <li>"Swam 20 laps in the pool"</li>
                </ul>
                <p className="note">
                  Include duration or distance for more accurate AI calorie estimates.
                </p>
              </div>
              
              <div className="structured-format">
                <h4>Structured Format Examples:</h4>
                <ul>
                  <li><code>item: 5K run, calories: 300, type: burn</code></li>
                  <li><code>item: 45-minute walk, calories: 150, type: burn</code></li>
                  <li><code>item: yoga session, calories: 120, type: burn</code></li>
                  <li><code>item: bike commute, calories: 200, type: burn</code></li>
                  <li><code>item: swimming laps, calories: 400, type: burn</code></li>
                </ul>
                <p className="note">
                  When using structured format, estimate calories based on your activity intensity and duration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="help-section">
        <h2>Frequently Asked Questions</h2>
        <div className="collapsible-help">
          <details>
            <summary>How accurate are the AI calorie estimates?</summary>
            <div className="details-content">
              <p>
                Our AI provides reasonable estimates based on average values for common foods and activities.
                For precise tracking, you can use the structured format to enter exact calorie values from
                nutrition labels or fitness trackers.
              </p>
              <p>
                <strong>Remember:</strong> You can always edit any logged activity to adjust the calorie count 
                if the AI estimate doesn't match your expectations.
              </p>
            </div>
          </details>
          <details>
            <summary>What if the AI doesn't understand my input?</summary>
            <div className="details-content">
              <p>If the AI has trouble understanding your natural language input:</p>
              <ul>
                <li>Try to be more specific with your description</li>
                <li>Use simpler language</li>
                <li>As a reliable alternative, use the structured format</li>
              </ul>
            </div>
          </details>
          <details>
            <summary>What if I make a mistake or need to change something I've logged?</summary>
            <div className="details-content">
              <p>
                You can easily edit or delete any logged activity at any time. Each activity in your log has an edit (pencil) 
                and delete (trash) button. When editing, you can change:
              </p>
              <ul>
                <li>The activity name (e.g., "banana" → "large banana")</li>
                <li>The calorie count (e.g., 105 → 125)</li>
                <li>The activity type (e.g., "consume" → "burn" if it was incorrectly categorized)</li>
              </ul>
              <p>
                Your daily totals and progress will automatically update with your changes.
              </p>
            </div>
          </details>
          <details>
            <summary>Is my data private and secure?</summary>
            <div className="details-content">
              <p>
                Yes, your privacy is important to us. All of your data is transmitted securely and stored 
                in your personal account. We use industry-standard encryption to protect your information.
              </p>
            </div>
          </details>
          <details>
            <summary>When should I use the structured format?</summary>
            <div className="details-content">
              <p>The structured format is particularly useful when:</p>
              <ul>
                <li>You want precise control over the calorie values</li>
                <li>The AI service is temporarily unavailable</li>
                <li>You're logging unusual items that the AI might not recognize</li>
                <li>You prefer a consistent, predictable input method</li>
              </ul>
            </div>
          </details>
          <details>
            <summary>Does Apollo work offline?</summary>
            <div className="details-content">
              <p>
                Apollo requires an internet connection to process and save your activity inputs.
                However, once items are logged, you can view your daily log even when offline.
              </p>
            </div>
          </details>
        </div>
      </section>

      <div className="help-footer">
        <Link to="/profile" className="button">Back to Profile</Link>
        <Link to="/track" className="text-link">
          Start tracking your activities
        </Link>
      </div>
    </div>
  );
} 