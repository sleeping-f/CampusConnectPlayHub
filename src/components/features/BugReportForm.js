import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import "./BugReportForm.css";

const BugReportForm = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      await axios.post("/api/bugs", {
        studentId: null, // later tie with logged-in user
        title,
        description,
        severity,
      });
      toast.success("Bug report submitted!");
      setTitle("");
      setDescription("");
      setSeverity("medium");
    } catch (err) {
      console.error("❌ Bug report error:", err);
      toast.error("Error submitting bug report.");
    }
  };

  return (
    <div className="bug-container">
      <h2 className="bug-title">Report a Bug</h2>
      <form onSubmit={handleSubmit}>
        <input
          className="bug-input"
          type="text"
          placeholder="Bug title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="bug-textarea"
          placeholder="Describe the bug..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select
          className="bug-select"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button type="submit" className="bug-btn">Submit Bug</button>
      </form>
    </div>
  );
};

export default BugReportForm;
