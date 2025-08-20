# playpowerBackend

This is the backend for the PlayPower application, a gamified learning platform.

## Features

*   User authentication and authorization
*   Level and task management
*   LLM-powered features
*   Inventory and store management
*   Game statistics and achievements

## Getting Started

### Prerequisites

*   Node.js (v14 or later)
*   npm
*   MongoDB

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/bhavyaGP/playpowerBackend.git
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  Create a `.env` file in the root directory.
2.  Add the following environment variables to the `.env` file:
    ```
    PORT=3000
    MONGODB_URI=<your_mongodb_uri>
    JWT_SECRET=<your_jwt_secret>
    ```

## Running the application

### Development mode

```bash
npm run dev
```

This will start the server in development mode with nodemon, which will automatically restart the server when you make changes to the code.

### Production mode

```bash
npm start
```

This will start the server in production mode.

### Running tests

```bash
npm test
```

This will run all the tests using Jest.

## API Documentation

The API is structured into the following routes:

*   `/api/auth`: Authentication routes (login, register)
*   `/api/levels`: Level management
*   `/api/llm`: LLM-powered features
*   `/api/ai`: AI-related routes
*   `/api/tasks`: Task management
*   `/api/inventory`: User inventory management
*   `/api/store`: Store management
*   `/api/stats`: User statistics
*   `/api/shop`: Shop management

For detailed information about each endpoint, please refer to the route files in the `routes` directory.

## Dependencies

### Production Dependencies

*   `@google/generative-ai`: ^0.24.1
*   `axios`: ^1.10.0
*   `dotenv`: ^17.2.0
*   `express`: ^5.1.0
*   `jsonwebtoken`: ^9.0.2
*   `mongoose`: ^8.16.3
*   `morgan`: ^1.10.0

### Development Dependencies

*   `jest`: ^30.0.4
*   `supertest`: ^7.1.3

## License

This project is licensed under the ISC License.
