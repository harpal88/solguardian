# SolGuardian - Real-time Solana Whale Activity Monitor

## Project Overview

SolGuardian is a comprehensive monitoring dashboard for tracking whale activity, wallet profiles, and transaction flows on the Solana blockchain. Built for the Solscan Monitoring Masters hackathon, this tool demonstrates how Solana's on-chain data can be accessed and utilized to enhance transparency and detect significant activity across the ecosystem.

### Problem Statement

There's a common misconception that "Solana's data layer is too complex" for effective monitoring. In reality, with the right tools and approach, Solana's on-chain data can provide valuable insights for traders, researchers, and security analysts. The challenge is making this data accessible, actionable, and presented in a user-friendly way.

SolGuardian addresses this challenge by providing real-time monitoring of whale activity, visualizing transaction flows, and profiling wallet behavior patterns - all through an intuitive interface that makes Solana's data layer approachable and useful.

### Key Features

- **Whale Watchlist**: Monitor known whale wallets and track their transaction activity
- **Wallet Profiling**: Analyze wallet behavior patterns and assign profile tags based on transaction history
- **Transaction Flow Analysis**: Visualize token movement between wallets, exchanges, and DEXs
- **Live Whale Tracker**: Real-time monitoring of large transactions across the Solana network
- **Historical Trend Analysis**: Chart-based visualization of transaction patterns over time

## Hackathon Focus Area

SolGuardian directly addresses the "Whale Activity & Token Flow Monitoring" focus area of the Solscan Monitoring Masters hackathon by:

- Monitoring large wallet movements using Solscan's APIs
- Visualizing token flows to and from major addresses, exchanges, and DEXs
- Providing real-time alerts for high-volume transfers from known whale wallets
- Offering insights into transaction patterns and wallet behaviors

The application demonstrates how Solscan's APIs can be leveraged to create powerful monitoring tools that make Solana's data layer accessible and actionable.

## Technical Architecture

SolGuardian is built as a React-based web application that leverages Solscan's comprehensive APIs to fetch and analyze on-chain data.

### Technology Stack

- **Frontend**: React.js with modern hooks and functional components
- **Data Visualization**: Chart.js for trend analysis and flow visualization
- **API Integration**: Direct integration with Solscan APIs
- **State Management**: React hooks for local state management
- **Styling**: Custom CSS with responsive design

### Solscan API Integration

SolGuardian utilizes several key Solscan API endpoints:

- `/account/transfer` - For fetching wallet transaction history
- `/account/token-accounts` - For retrieving token holdings
- `/transaction/last` - For real-time transaction monitoring
- `/token/defi/activities` - For DEX activity monitoring

## Data Flow & Logic

1. **Wallet Data Collection**:
   - User inputs a wallet address or selects from the watchlist
   - Application fetches transaction history and token holdings
   - Data is normalized and processed for analysis

2. **Real-time Monitoring**:
   - Polling mechanism checks for new large transactions
   - Configurable thresholds for transaction size
   - Automatic pausing when significant activity is detected

3. **Profile Generation**:
   - Transaction patterns are analyzed to determine wallet behavior
   - Metrics include average transfer size, frequency, and protocol interactions
   - Behavior tags are assigned based on activity patterns

4. **Flow Visualization**:
   - Transaction data is processed to show token movement
   - Categorization of destinations (exchanges, DEXs, other whales)
   - Visual representation of token flow magnitude

## Installation and Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Solscan API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/harpal88/solguardian.git
   cd solguardian
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory based on the `.env.example` template:
   ```
   # Copy the example file
   cp .env.example .env

   # Edit the .env file and add your Solscan API key
   # Get your API key from https://public-api.solscan.io/
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### Whale Watchlist

The Whale Watchlist tab allows you to monitor known whale wallets and track their transaction activity:

1. Browse the pre-populated list of known whale wallets
2. Add custom wallets to your watchlist
3. Click on any wallet to view detailed transaction history

### Wallet Track

The Wallet Track tab provides detailed analysis of any Solana wallet:

1. Enter a wallet address in the input field
2. Click "Fetch Transactions" to load wallet data
3. Navigate between sub-tabs to view different analyses:
   - Transactions: List of recent transfers
   - Wallet Profile: Behavior analysis and metrics
   - Transaction Flow: Visualization of token movement
   - Transaction Trends: Historical charts and patterns

### Live Whale Tracker

The Live Whale Tracker tab provides real-time monitoring of large transactions:

1. Configure minimum transaction size threshold
2. Set refresh interval for polling
3. Filter by token type if desired
4. View live feed of large transactions as they occur

## Challenges & Solutions

### Challenge: API Rate Limiting

**Solution**: Implemented intelligent caching and pagination to minimize API calls while maintaining data freshness.

### Challenge: Processing Large Transaction Datasets

**Solution**: Developed optimized data normalization and filtering utilities to handle large transaction volumes efficiently.

### Challenge: Real-time Updates Without WebSockets

**Solution**: Created a configurable polling system with automatic pause/resume functionality to detect significant activity without overwhelming the API.

## Impact & Relevance

SolGuardian provides significant benefits to the Solana ecosystem:

### Enhanced Transparency
- Makes whale activity visible and trackable for all users
- Demystifies large token movements that can impact market conditions
- Provides context for transaction patterns through wallet profiling

### Improved Security
- Helps identify suspicious transaction patterns
- Enables monitoring of known addresses for unusual activity
- Provides real-time visibility into large fund movements

### Better User Experience
- Transforms complex blockchain data into intuitive visualizations
- Simplifies the process of tracking multiple whale wallets
- Makes Solana's data layer accessible to users without technical blockchain knowledge

### Ecosystem Value
- Demonstrates the power and accessibility of Solscan's APIs
- Contributes to the narrative that Solana's data is approachable and valuable
- Provides a foundation for more advanced monitoring tools in the ecosystem

## Future Enhancements

- Integration with additional data sources for more comprehensive analysis
- Machine learning-based anomaly detection for suspicious transactions
- Alert system for custom transaction patterns
- Mobile application for on-the-go monitoring

## Video Demonstration

A comprehensive video walkthrough of SolGuardian is available that demonstrates all the key features:

- Whale Watchlist functionality
- Wallet Profile analysis
- Transaction Flow visualization
- Live Whale Tracker in action

The video provides a clear demonstration of how to use each feature and the insights they provide.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## License

[MIT License](LICENSE)

## Acknowledgments

- Solscan for providing the comprehensive APIs that power this application and organizing the Monitoring Masters hackathon
- Special thanks to the Solscan team for their excellent API documentation and support
- Solana Foundation for building an incredible blockchain ecosystem
- The Solana developer community for their valuable resources and inspiration
