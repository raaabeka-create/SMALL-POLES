/**
 * SMALL POLES application entry point.
 * Keep UI bootstrapping here; gameplay systems will live in src/game/.
 */

const status = document.querySelector("#app-status");

if (status) {
  status.textContent = "Project foundation loaded. Gameplay is the next development stage.";
}
