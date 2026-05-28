pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

    environment {
        CI = 'true'
    }


    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Lint & Format Check') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Build Backend') {
            steps {
                sh 'npx prisma generate'
                sh 'npm run build'
            }
        }

        stage('Deploy Backend') {
            steps {
                echo 'Add backend deployment commands here (e.g., Docker, SSH, AWS)'
            }
        }
    }

    post {
        always {
            echo 'Backend Build completed.'
        }
        success {
            echo 'Backend Pipeline succeeded!'
        }
        failure {
            echo 'Backend Pipeline failed!'
        }
    }
}
