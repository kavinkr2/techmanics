# TechManics | AI-Powered Freight Forecasting & Optimization

An intelligent logistics decision-support system for freight forecasting, vessel chartering optimization, and bulk cargo procurement planning.

**Smart Forecasting. Optimized Chartering. Efficient Cargo Procurement.**

---

## About the Project

TechManics is our **Smart India Hackathon (SIH) 2026** project, developed under Problem Statement **SIH26006**.

The project focuses on helping logistics and procurement teams make better decisions when transporting bulk commodities from overseas to the East Coast of India.

Freight rates, vessel availability, port congestion, and commodity prices can change frequently. These changes make it difficult to decide when to procure cargo, which vessel to charter, and how to manage transportation costs.

TechManics brings these factors together in one platform to support data-driven planning and optimization.

Our goal is to move beyond simply displaying logistics data and help users identify practical, cost-efficient decisions.

---

## Problem Statement

**SIH26006: Development of an Intelligent Freight Forecasting Model for Optimized Vessel Chartering and Bulk Cargo Procurement from Overseas to the East Coast of India.**

The project addresses the challenges involved in:

* Forecasting freight rate movements
* Selecting suitable vessels for bulk cargo transportation
* Optimizing vessel chartering decisions
* Planning cargo procurement based on market and freight trends
* Managing transportation risks caused by market fluctuations and port congestion

---

## Key Features

### 1. Freight Market Dashboard

Provides a consolidated view of freight market indicators, including the Baltic Dry Index (BDI) and its sub-indices, along with freight trends and forecast information.

### 2. Freight Forecasting

Displays forecasted freight movements to help users understand possible market changes and plan transportation decisions accordingly.

### 3. Route & Port Monitoring

Provides route-related information, vessel positions, port congestion indicators, and alerts to support better logistics planning.

### 4. Vessel Chartering Optimizer

Helps identify suitable vessel options for a given cargo requirement and route.

The optimizer considers relevant vessel and port constraints to support feasible vessel assignments and cost-conscious chartering decisions.

**Example scenario:** 80,000 tonnes of coal transported from Australia to Paradip Port.

The prototype demonstrates a sample optimization result involving three Handysize vessels, with an illustrative estimated cost of **$3.54 million**. This is a demonstration result and not a live market quotation.

### 5. Idle Vessel Management

Supports the identification and management of idle vessel capacity, helping improve vessel utilization and reduce avoidable inefficiencies.

### 6. AI Logistics Copilot

Provides a conversational interface where users can ask logistics-related questions and receive assistance based on the information available in the prototype.

### 7. Cargo Records

Allows users to view and manage cargo-related information to support procurement and transportation planning.

### 8. Scenario Analysis

Enables users to explore different planning scenarios, such as:

* Base Case
* High Volume
* Market Shock
* Alternative sourcing routes, including Brazil to Paradip

This helps users understand how changing market or cargo conditions may affect logistics decisions.

### 9. East Coast Port Support

The prototype includes key East Coast ports such as:

* Paradip
* Visakhapatnam
* Haldia
* Ennore

---

## How Optimization Fits In

Optimization is a core part of TechManics.

The platform is designed not only to forecast freight trends but also to support decisions on how cargo should be transported.

By considering cargo requirements, vessel characteristics, port limitations, and estimated costs, the system aims to identify feasible vessel assignments that support efficient chartering decisions.

The broader objective is to connect freight forecasting with vessel chartering and cargo procurement planning.

---

## Technology Stack

| Component       | Technologies                                         |
| --------------- | ---------------------------------------------------- |
| Frontend        | React, Vite                                          |
| Backend         | Python, FastAPI                                      |
| Data Validation | Pydantic                                             |
| Optimization    | Google OR-Tools                                      |
| AI Copilot      | LangChain, OpenRouter-compatible LLM integration     |
| API Server      | Uvicorn                                              |
| Forecasting     | Python-based forecasting and machine learning models |

---

## System Architecture

TechManics follows a frontend-backend architecture.

```text
                         USER
                           |
                           v
                  REACT / VITE FRONTEND
                     (website/)
                           |
                           v
                    FASTAPI BACKEND
                       (main.py)
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
     Forecasting      Optimization      AI Copilot
          |                |                |
          |                |                |
          v                v                v
     Freight Trends    Vessel & Port    Logistics
      & Forecasts       Constraints     Assistance
          |                |                |
          +----------------+----------------+
                           |
                           v
               LOGISTICS DECISION SUPPORT
```

---

## Project Structure

```text
techmanics/
│
├── main.py
├── main_realtime.py
├── optimizer.py
├── forecast_engine.py
├── copilot_tools.py
├── llm_copilot.py
├── risk.py
├── stopping.py
├── port_simulation.py
│
├── 01_generate_data.py
├── 02_train_model.py
├── 03_decision_engine.py
├── 04_stage1_baselines.py
├── 05_stage2_lightgbm.py
├── 06_predict.py
│
├── generate_all.py
├── export_json.py
├── maritime_scraper.py
│
├── models/
│   ├── prophet_freight_model.json
│   └── xgb_quantile_*.json
│
├── scrapers/
│   └── maritime_scraper.py
│
├── website/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── app.css
│   │   └── ...
│   ├── vite.config.ts
│   └── ...
│
├── requirements.txt
├── package.json
├── vite.config.js
├── vite.config.ts
└── README.md
```

---

## Project Workflow

1. The user enters cargo and transportation requirements.
2. The system uses available freight and logistics information to support planning.
3. The forecasting component provides freight trend insights.
4. The optimizer evaluates suitable vessel assignments under relevant constraints.
5. The platform displays the resulting options and estimated costs.
6. Users can explore alternative scenarios and market conditions.
7. The AI Copilot provides additional assistance for logistics-related queries.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

* **Python 3.13**
* **Node.js and npm**
* **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/kavinkr2/techmanics.git
cd techmanics
```

### 2. Set Up the Backend

The FastAPI backend is located in the project root.

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

**Windows Git Bash:**

```bash
source venv/Scripts/activate
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Start the FastAPI backend:

```bash
python -m uvicorn main:app --reload --port 8000
```

The backend will run at:

```text
http://127.0.0.1:8000
```

FastAPI interactive documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Set Up the Frontend

The React/Vite frontend is located inside the `website` directory.

Open a new terminal and navigate to the frontend:

```bash
cd techmanics/website
```

Install the frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

Open that URL in your browser to access the TechManics application.

### 4. Run Backend and Frontend Together

For the complete application, keep both servers running.

**Terminal 1 - Backend**

From the project root:

```bash
cd techmanics
source venv/Scripts/activate
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend**

From the project root:

```bash
cd techmanics/website
npm run dev
```

The frontend communicates with the FastAPI backend running on port `8000`.

---

## Environment Variables

TechManics uses environment variables for configuration and API credentials.

Create or configure your environment file locally as required by the application.


The following files should remain local:

```text
.env
apikey.env
```

If you are setting up the project from scratch, add your own credentials according to the environment variables required by the application.

---

## Expected Impact

TechManics aims to support:

* More informed vessel chartering decisions
* Better freight market awareness
* Improved cargo procurement planning
* More efficient vessel utilization
* Better preparedness for market fluctuations
* More structured logistics decision-making

The actual impact depends on data quality, model performance, and operational validation.

---

## Future Scope

Potential future improvements include:

* Integration with reliable real-time freight and port data sources
* Improved forecasting using larger historical market datasets
* More advanced cargo procurement optimization
* Expanded vessel and port constraint handling
* Enhanced scenario simulation and risk analysis
* Validation using real-world logistics and procurement datasets
* Integration of additional East Coast and international trade routes

---

## Project Status

TechManics is being developed as part of **Smart India Hackathon 2026**.

The current version is a working prototype demonstrating:

* Freight market insights
* Freight forecasting
* Vessel chartering optimization
* Logistics monitoring
* Idle vessel management
* Cargo records
* Scenario analysis
* AI-assisted decision support

Some displayed values and optimization results are illustrative and should not be treated as verified live operational data.

---

## Demo

The prototype demonstrates an example logistics planning workflow:

**Cargo:** 80,000 tonnes of coal
**Origin:** Australia
**Destination:** Paradip Port
**Optimization Output:** 3 Handysize vessels
**Illustrative Estimated Cost:** $3.54 million

A prototype video and additional screenshots can be added here.

---

## Team TechManics

Developed by **Team TechManics** for **Smart India Hackathon 2026**.

**Problem Statement:** SIH26006

---

## Acknowledgements

We would like to thank **Smart India Hackathon 2026**, our institution, mentors, and everyone who supported us throughout the development of this project.

---

## License

This project was developed as a prototype for **Smart India Hackathon 2026**.

---

**TechManics | Forecast Smarter. Optimize Better. Move Efficiently.**
