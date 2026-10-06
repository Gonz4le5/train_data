"use strict";

/* =========================================================
   IndexedDB
========================================================= */

const DB_NAME = "DailyMemoDB";
const DB_VERSION = 1;
const STORE_NAME = "days";

let db;


/**
 * IndexedDBを初期化
 */
function openDatabase() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {

            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {

                database.createObjectStore(STORE_NAME, {
                    keyPath: "date"
                });

            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


/**
 * 指定日のデータ取得
 */
function getDay(date) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            STORE_NAME,
            "readonly"
        );

        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(date);

        request.onsuccess = function () {
            resolve(request.result || null);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


/**
 * 日データ保存
 */
function saveDay(dayData) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            STORE_NAME,
            "readwrite"
        );

        const store = transaction.objectStore(STORE_NAME);

        const request = store.put(dayData);

        request.onsuccess = function () {
            resolve();
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


/* =========================================================
   データ構造
========================================================= */

/*
    1日のデータ

    {
        date: "2026-09-30",
        title: "今日の作業",
        tasks: [
            {
                id: "...",
                title: "タスクA",
                variables: [60, 10, 10],
                result: 6000
            }
        ]
    }
*/


function createEmptyDay(date) {

    return {
        date: date,
        title: "",
        tasks: []
    };
}


function createTask() {

    return {
        id: crypto.randomUUID(),

        title: "",

        variables: [
            1,
            1
        ]
    };
}


/* =========================================================
   現在の日付
========================================================= */

let currentDate = getTodayString();
let currentDayData = null;


/**
 * 今日の日付をYYYY-MM-DDで取得
 */
function getTodayString() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/**
 * 日付を変更
 */
function changeDate(offset) {

    const date = new Date(currentDate + "T00:00:00");

    date.setDate(
        date.getDate() + offset
    );

    currentDate =
        formatDate(date);

    loadCurrentDay();
}


/**
 * DateをYYYY-MM-DDに変換
 */
function formatDate(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================================================
   日データ読み込み
========================================================= */

async function loadCurrentDay() {

    let day = await getDay(currentDate);

    if (!day) {

        day = createEmptyDay(
            currentDate
        );
    }

    currentDayData = day;

    render();
}


/* =========================================================
   描画
========================================================= */

function render() {

    document.getElementById(
        "datePicker"
    ).value = currentDate;

    document.getElementById(
        "dayTitle"
    ).value = currentDayData.title || "";

    renderTasks();
}


/**
 * タスク一覧描画
 */
function renderTasks() {

    const taskList =
        document.getElementById("taskList");

    const emptyMessage =
        document.getElementById("emptyMessage");

    taskList.innerHTML = "";

    if (
        !currentDayData.tasks ||
        currentDayData.tasks.length === 0
    ) {

        emptyMessage.style.display = "block";

        return;
    }

    emptyMessage.style.display = "none";

    currentDayData.tasks.forEach(
        (task, index) => {

            const element =
                createTaskElement(
                    task,
                    index
                );

            taskList.appendChild(element);
        }
    );
}


/* =========================================================
   タスクUI
========================================================= */

function createTaskElement(task, index) {

    const element =
        document.createElement("div");

    element.className = "task";

    /* タスクヘッダー */

    const header =
        document.createElement("div");

    header.className = "task-header";


    const number =
        document.createElement("span");

    number.className = "task-number";

    number.textContent =
        `#${index + 1}`;


    const title =
        document.createElement("input");

    title.type = "text";

    title.className = "task-title";

    title.placeholder =
        "タスクのタイトル";

    title.value =
        task.title || "";


    title.addEventListener(
        "input",
        async function () {

            task.title = title.value;

            await saveCurrentDay();
        }
    );


    const deleteButton =
        document.createElement("button");

    deleteButton.className =
        "delete-task-button";

    deleteButton.textContent =
        "削除";


    deleteButton.addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "このタスクを削除しますか？"
                );

            if (!confirmed) {
                return;
            }

            currentDayData.tasks =
                currentDayData.tasks.filter(
                    item => item.id !== task.id
                );

            await saveCurrentDay();

            renderTasks();
        }
    );


    header.appendChild(number);

    header.appendChild(title);

    header.appendChild(deleteButton);


    /* 変数 */

    const variables =
        document.createElement("div");

    variables.className =
        "variables";


    task.variables.forEach(
        (value, variableIndex) => {

            if (variableIndex > 0) {

                const multiply =
                    document.createElement("span");

                multiply.className =
                    "multiply";

                multiply.textContent =
                    "×";

                variables.appendChild(
                    multiply
                );
            }


            const wrapper =
                document.createElement("div");

            wrapper.className =
                "variable";


            const input =
                document.createElement("input");

            input.type = "number";

            input.step = "any";

            input.value = value;

            input.placeholder = "数値";


            input.addEventListener(
                "input",
                async function () {

                    const parsed =
                        Number(input.value);

                    task.variables[
                        variableIndex
                    ] = Number.isFinite(parsed)
                        ? parsed
                        : 0;

                    updateTaskResult(
                        task,
                        resultElement,
                        formulaElement
                    );

                    await saveCurrentDay();
                }
            );


            wrapper.appendChild(input);

            variables.appendChild(wrapper);
        }
    );


    /* 変数追加ボタン */

    const addVariable =
        document.createElement("button");

    addVariable.className =
        "add-variable-button";

    addVariable.textContent =
        "＋ 数値";


    addVariable.addEventListener(
        "click",
        async function () {

            task.variables.push(1);

            await saveCurrentDay();

            renderTasks();
        }
    );


    variables.appendChild(
        addVariable
    );


    /* 結果 */

    const resultArea =
        document.createElement("div");

    resultArea.className =
        "result-area";


    const formulaElement =
        document.createElement("div");

    formulaElement.className =
        "formula";


    const resultElement =
        document.createElement("div");

    resultElement.className =
        "result";


    resultArea.appendChild(
        formulaElement
    );

    resultArea.appendChild(
        resultElement
    );


    /* 全体 */

    element.appendChild(header);

    element.appendChild(variables);

    element.appendChild(resultArea);


    updateTaskResult(
        task,
        resultElement,
        formulaElement
    );


    return element;
}


/* =========================================================
   計算
========================================================= */

function calculateProduct(variables) {
    if (!variables || variables.length === 0) {
        return 0;
    }

    const nums = variables
        .map(value => Number(value))
        .filter(Number.isFinite);

    if (nums.length === 0) return 0;
    if (nums.length === 1) return nums[0];
    if (nums.length === 2) return nums[0] * nums[1];

    // 3個目は乗算値ではなく「繰り返し回数」。
    // 10 × 3 3 → 10 × 3 + 10 × 3 = 60
    const base = nums[0] * nums[1];
    const repetitions = Math.max(1, nums[2] - 1);
    return base * repetitions;
}


/**
 * タスクの計算結果を更新
 */
function updateTaskResult(
    task,
    resultElement,
    formulaElement
) {

    const variables =
        task.variables.map(
            value => Number(value)
        );

    const result =
        calculateProduct(
            variables
        );


    if (variables.length >= 3) {
        const repetitions = Math.max(1, Number(variables[2]) - 1);
        formulaElement.textContent =
            `${variables[0]} × ${variables[1]} × ${repetitions}回`;
    } else {
        formulaElement.textContent =
            variables.join(" × ");
    }


    resultElement.textContent =
        result.toLocaleString();
}


/* =========================================================
   保存
========================================================= */

async function saveCurrentDay() {

    await saveDay(
        currentDayData
    );
}


/* =========================================================
   イベント
========================================================= */

function setupEvents() {

    /* 前の日 */

    document.getElementById(
        "prevDate"
    ).addEventListener(
        "click",
        function () {

            changeDate(-1);
        }
    );


    /* 次の日 */

    document.getElementById(
        "nextDate"
    ).addEventListener(
        "click",
        function () {

            changeDate(1);
        }
    );


    /* 今日 */

    document.getElementById(
        "todayButton"
    ).addEventListener(
        "click",
        function () {

            currentDate =
                getTodayString();

            loadCurrentDay();
        }
    );


    /* 日付直接変更 */

    document.getElementById(
        "datePicker"
    ).addEventListener(
        "change",
        function (event) {

            currentDate =
                event.target.value;

            loadCurrentDay();
        }
    );


    /* 日タイトル */

    document.getElementById(
        "dayTitle"
    ).addEventListener(
        "input",
        async function (event) {

            currentDayData.title =
                event.target.value;

            await saveCurrentDay();
        }
    );


    /* タスク追加 */

    document.getElementById(
        "addTaskButton"
    ).addEventListener(
        "click",
        async function () {

            currentDayData.tasks.push(
                createTask()
            );

            await saveCurrentDay();

            renderTasks();
        }
    );
}


/* =========================================================
   アプリ起動
========================================================= */

async function init() {

    try {

        await openDatabase();

        setupEvents();

        await loadCurrentDay();

    } catch (error) {

        console.error(error);

        alert(
            "データベースを初期化できませんでした。"
        );
    }
}


init();
