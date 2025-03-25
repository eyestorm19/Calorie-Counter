import React, { useState } from 'react';
import thinkingGif from '../assets/thinking.gif'; // Ensure the path is correct

const YourComponent = () => {
    const [isThinking, setIsThinking] = useState(false);

    const handleButtonClick = async () => {
        setIsThinking(true);
        console.log("AI is thinking..."); // Debugging line
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000)); // Replace with actual AI call
        setIsThinking(false);
    };

    return (
        <button onClick={handleButtonClick} className="ai-button">
            {isThinking ? (
                <img src={thinkingGif} alt="Thinking..." className="thinking-icon" />
            ) : (
                'Submit'
            )}
        </button>
    );
};

export default YourComponent; 