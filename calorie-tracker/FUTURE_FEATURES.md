# Future features

- **Move deterministic answer logic to backend**  
  Currently, stats_query, log_count, log_list, and goal_check are computed in the frontend (visible in the bundle). In the future, move this logic to the Cloud Function so templates and question-type handling are not exposed in client-side code. The backend would receive the same LLM response (question_type + slots), run the deterministic logic server-side (with activities/stats passed in the request or loaded from Firestore), and return only the final answer text.
