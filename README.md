# Field Verify

## Description

Field Verify is a web application designed for instant on-site verification of construction material certifications. By leveraging zero-knowledge proofs, it ensures the authenticity of materials without compromising manufacturers' proprietary information.

## Features

- **Instant Verification:** Quickly validate material certifications on-site.
- **Privacy-Preserving:** Utilizes zero-knowledge proofs to protect confidential manufacturer data.
- **User-Friendly Interface:** Simplified design for ease of use by field personnel.

## Installation and Usage

### Prerequisites

Ensure you have the following installed on your system:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js (v18.18.0 is what I used)](https://nodejs.org/)
- npm (comes with Node.js)

Verify installation:

```bash
docker --version
docker-compose --version  
node -v  
npm -v  
```

### Clone the Repository

Clone the project repository to your local machine:

```bash
git clone https://github.com/patrickpistor/field-verify.git  
```

### Backend Setup (Docker)

Navigate to the project directory and start Docker containers:

```bash
cd field-verify/workspace/pico-verification
docker-compose up -d  
```

Confirm services are running successfully:

```bash
docker-compose ps  
```

### Frontend Setup (Next.js)

Navigate to the web directory and install frontend dependencies:

```bash
cd web  
npm install  
```

Next we have a setup script that needs to run for setting up the environment variables. This script will create a `.env.local` file in the root of the `web` directory. This file will contain the environment variables needed for the frontend to communicate with the backend.

```bash
chmod +x setup-dev.sh
./setup-dev.sh
```

After dependencies finish installing, run the frontend development server:

```bash
npm run dev  
```

### Accessing the Application

Once your backend and frontend are running:

- Open your browser and navigate to [http://localhost:3001](http://localhost:3001).
- You should see the Field Verify application running locally.

## Contributing

We welcome contributions to enhance Field Verify. To contribute:

1. Fork the repository.
2. Create a new branch: git checkout -b feature-name.
3. Commit your changes: git commit -m 'Add feature'.
4. Push to the branch: git push origin feature-name.
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

We extend our gratitude to the open-source community and the developers of the libraries and tools that made this project possible.
