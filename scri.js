document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const todoInput = document.getElementById("todo-input");
  const dueDateInput = document.getElementById("due-date");
  const prioritySelect = document.getElementById("priority-select");
  const categorySelect = document.getElementById("category-select");
  const addTaskButton = document.getElementById("add-task-btn");
  const todoList = document.getElementById("todo-list");
  const searchInput = document.getElementById("search-input");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const editModal = document.getElementById("edit-modal");
  const closeModal = document.querySelector(".close-modal");
  const editTaskInput = document.getElementById("edit-task-input");
  const editDueDate = document.getElementById("edit-due-date");
  const editPrioritySelect = document.getElementById("edit-priority-select");
  const editCategorySelect = document.getElementById("edit-category-select");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const emptyState = document.querySelector(".empty-state");
  const totalTasksElement = document.getElementById("total-tasks");
  const pendingTasksElement = document.getElementById("pending-tasks");
  const completedTasksElement = document.getElementById("completed-tasks");

  // State variables
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";
  let currentEditTaskId = null;
  let draggedItem = null;

  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem("theme") || "dark-mode";
  document.body.className = savedTheme;
  updateThemeIcon();

  // Initialize the app
  init();

  function init() {
    renderAllTasks();
    updateStats();
    checkEmptyState();

    // Set today as the default due date
    const today = new Date().toISOString().split("T")[0];
    dueDateInput.value = today;

    // Event listeners
    addTaskButton.addEventListener("click", addTask);
    todoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addTask();
    });
    searchInput.addEventListener("input", filterTasks);

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.getAttribute("data-filter");
        filterTasks();
      });
    });

    themeToggle.addEventListener("click", toggleTheme);
    closeModal.addEventListener("click", () => {
      editModal.classList.remove("active");
    });
    saveEditBtn.addEventListener("click", saveEditTask);

    // Close modal on outside click
    window.addEventListener("click", (e) => {
      if (e.target === editModal) {
        editModal.classList.remove("active");
      }
    });

    // Enable drag and drop
    enableDragAndDrop();

    // Focus on input
    todoInput.focus();
  }

  function addTask() {
    const taskText = todoInput.value.trim();
    if (taskText === "") return;

    const newTask = {
      id: Date.now(),
      text: taskText,
      completed: false,
      dueDate: dueDateInput.value,
      priority: prioritySelect.value,
      category: categorySelect.value,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    saveTasks();
    renderTask(newTask);

    // Reset input fields
    todoInput.value = "";
    const today = new Date().toISOString().split("T")[0];
    dueDateInput.value = today;
    prioritySelect.value = "medium";
    categorySelect.value = "personal";

    // Update stats
    updateStats();
    checkEmptyState();

    // Focus back on input
    todoInput.focus();
  }

  function renderTask(task) {
    const li = document.createElement("li");
    li.setAttribute("data-id", task.id);
    li.setAttribute("draggable", true);
    if (task.completed) li.classList.add("completed");

    // Format due date display
    const dueDate = new Date(task.dueDate);
    const formattedDate = dueDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Check if task is overdue or due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = dueDate < today && !task.completed;
    const isToday = dueDate.toDateString() === today.toDateString();

    let dueDateClass = "";
    if (isOverdue) dueDateClass = "overdue";
    else if (isToday) dueDateClass = "today";

    li.innerHTML = `
      <div class="task-content">
        <div class="task-left">
          <input type="checkbox" class="task-checkbox" ${
            task.completed ? "checked" : ""
          }>
          <div class="task-details">
            <div class="task-text">${task.text}</div>
            <div class="task-meta">
              <div class="task-category" data-category="${task.category}">
                <i class="fas fa-tag"></i> ${task.category}
              </div>
              <div class="task-priority" data-priority="${task.priority}">
                <i class="fas fa-flag"></i> ${task.priority}
              </div>
              <div class="task-due-date ${dueDateClass}">
                <i class="fas fa-calendar"></i> ${formattedDate}
              </div>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn edit-btn" title="Edit Task">
            <i class="fas fa-edit"></i>
          </button>
          <button class="task-action-btn delete-btn" title="Delete Task">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    // Event listeners for task actions
    const checkbox = li.querySelector(".task-checkbox");
    checkbox.addEventListener("change", () => toggleTaskCompletion(task.id));

    const editBtn = li.querySelector(".edit-btn");
    editBtn.addEventListener("click", () => openEditModal(task.id));

    const deleteBtn = li.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    // Add drag event listeners
    li.addEventListener("dragstart", handleDragStart);
    li.addEventListener("dragend", handleDragEnd);

    todoList.appendChild(li);

    // Apply animation
    setTimeout(() => {
      li.style.animation = "slideIn 0.3s ease-in-out forwards";
    }, 10);
  }

  function renderAllTasks() {
    todoList.innerHTML = "";

    // Sort tasks by priority and due date
    const sortedTasks = [...tasks].sort((a, b) => {
      // Sort by completion status
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // Sort by due date
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // Filter tasks
    const filteredTasks = sortedTasks.filter((task) => {
      // Apply current filter
      if (currentFilter === "active" && task.completed) return false;
      if (currentFilter === "completed" && !task.completed) return false;

      // Apply search filter
      const searchTerm = searchInput.value.toLowerCase();
      if (searchTerm) {
        return (
          task.text.toLowerCase().includes(searchTerm) ||
          task.category.toLowerCase().includes(searchTerm) ||
          task.priority.toLowerCase().includes(searchTerm)
        );
      }

      return true;
    });

    filteredTasks.forEach((task) => renderTask(task));
    checkEmptyState();
  }

  function toggleTaskCompletion(taskId) {
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex].completed = !tasks[taskIndex].completed;
      saveTasks();

      // Update the task in the DOM
      const li = document.querySelector(`li[data-id="${taskId}"]`);
      if (li) {
        li.classList.toggle("completed");

        // Add completion animation
        if (tasks[taskIndex].completed) {
          li.style.animation = "fadeIn 0.3s ease-in-out";
        }
      }

      updateStats();
      filterTasks(); // Re-apply filters after changing completion status
    }
  }

  function openEditModal(taskId) {
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      const task = tasks[taskIndex];

      // Populate modal with task data
      editTaskInput.value = task.text;
      editDueDate.value = task.dueDate;
      editPrioritySelect.value = task.priority;
      editCategorySelect.value = task.category;

      // Store the ID of the task being edited
      currentEditTaskId = taskId;

      // Show modal
      editModal.classList.add("active");

      // Focus on the edit input
      editTaskInput.focus();
    }
  }

  function saveEditTask() {
    if (!currentEditTaskId) return;

    const taskIndex = tasks.findIndex((task) => task.id === currentEditTaskId);
    if (taskIndex !== -1) {
      const taskText = editTaskInput.value.trim();
      if (taskText === "") return;

      // Update task data
      tasks[taskIndex].text = taskText;
      tasks[taskIndex].dueDate = editDueDate.value;
      tasks[taskIndex].priority = editPrioritySelect.value;
      tasks[taskIndex].category = editCategorySelect.value;

      // Save changes
      saveTasks();

      // Close modal
      editModal.classList.remove("active");

      // Re-render tasks
      renderAllTasks();
    }
  }

  function deleteTask(taskId) {
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      const li = document.querySelector(`li[data-id="${taskId}"]`);

      // Add delete animation
      if (li) {
        li.style.animation = "fadeOut 0.3s ease-in-out";

        // Wait for animation to complete before removing
        setTimeout(() => {
          // Remove from tasks array
          tasks = tasks.filter((task) => task.id !== taskId);
          saveTasks();

          // Remove from DOM
          li.remove();

          // Update stats
          updateStats();
          checkEmptyState();
        }, 300);
      } else {
        // If element not found, just remove from array
        tasks = tasks.filter((task) => task.id !== taskId);
        saveTasks();
        updateStats();
        checkEmptyState();
      }
    }
  }

  function filterTasks() {
    renderAllTasks();
  }

  function updateStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    totalTasksElement.textContent = totalTasks;
    completedTasksElement.textContent = completedTasks;
    pendingTasksElement.textContent = pendingTasks;
  }

  function checkEmptyState() {
    // Apply search filter and current filter
    const searchTerm = searchInput.value.toLowerCase();
    let filteredCount = tasks.filter((task) => {
      // Apply current filter
      if (currentFilter === "active" && task.completed) return false;
      if (currentFilter === "completed" && !task.completed) return false;

      // Apply search filter
      if (searchTerm) {
        return (
          task.text.toLowerCase().includes(searchTerm) ||
          task.category.toLowerCase().includes(searchTerm) ||
          task.priority.toLowerCase().includes(searchTerm)
        );
      }

      return true;
    }).length;

    if (filteredCount === 0) {
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
    }
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function toggleTheme() {
    const isDarkMode = document.body.classList.contains("dark-mode");
    document.body.className = isDarkMode ? "light-mode" : "dark-mode";
    localStorage.setItem("theme", isDarkMode ? "light-mode" : "dark-mode");
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDarkMode = document.body.classList.contains("dark-mode");
    themeToggle.innerHTML = isDarkMode
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  // Drag and drop functionality
  function enableDragAndDrop() {
    todoList.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingItem = document.querySelector(".dragging");
      if (!draggingItem) return;

      const afterElement = getDragAfterElement(todoList, e.clientY);
      if (afterElement == null) {
        todoList.appendChild(draggingItem);
      } else {
        todoList.insertBefore(draggingItem, afterElement);
      }
    });
  }

  function handleDragStart(e) {
    this.classList.add("dragging");
    draggedItem = this;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", this.innerHTML);
  }

  function handleDragEnd() {
    this.classList.remove("dragging");
    draggedItem = null;

    // Update task order in storage
    updateTaskOrder();
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll("li:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  function updateTaskOrder() {
    const newOrder = [];
    const taskElements = todoList.querySelectorAll("li");

    taskElements.forEach((element) => {
      const taskId = parseInt(element.getAttribute("data-id"));
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        newOrder.push(task);
      }
    });

    // Update tasks array with new order
    tasks = newOrder;
    saveTasks();
  }
});
