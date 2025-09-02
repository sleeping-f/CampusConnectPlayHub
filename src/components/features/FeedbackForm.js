import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import "./FeedbackForm.css";

const FeedbackForm = () => {
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error("Please enter feedback.");
      return;
    }

    try {
      await axios.post("/api/feedback", {
        studentId: null, // later connect to logged-in user
        message,
      });

      toast.success("✅ Feedback submitted!");
      setMessage("");
    } catch (err) {
      console.error("❌ Feedback error:", err);
      toast.error("Error submitting feedback.");
    }
  };

  return (
    <div className="feedback-container">
      <h2 className="feedback-title">Share Your Feedback</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          className="feedback-textarea"
          placeholder="Write your feedback..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="feedback-btn">
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
