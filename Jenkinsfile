def withDbCredentials(String credentialsId, Closure body) {
    withCredentials([
        usernamePassword(
            credentialsId: credentialsId,
            usernameVariable: "DB_USER",
            passwordVariable: "DB_PASSWORD"
        )
    ]) {
        body()
    }
}

pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 10, unit: "MINUTES")
    }

    parameters {
        string(name: "DB_CREDENTIALS_ID", defaultValue: "", description: "Jenkins credentialsId for DB user/password. Leave empty to skip DB/backend stages.")
        booleanParam(name: "ENABLE_SONAR", defaultValue: true, description: "Run SonarQube analysis on develop branch.")
    }

    environment {
        PROJECT_NAME       = "tower-defense"
        TARGET_DIR         = "/var/jenkins_home/projects/${PROJECT_NAME}/${BRANCH_NAME}"
        SONAR_SCANNER_OPTS = "-Xmx512m"
        BACKEND_CONTAINER  = "${PROJECT_NAME}_${BRANCH_NAME}_backend"
        DB_CONTAINER       = "${PROJECT_NAME}_${BRANCH_NAME}_db"
        DB_VOLUME          = "${PROJECT_NAME}_${BRANCH_NAME}_db_data"
        DB_NAME            = "appdb"
    }

    stages {
        stage("Checkout") {
            steps {
                checkout scm
            }
        }

        stage("Build Frontend") {
            when {
                expression { fileExists("frontend/package.json") }
            }
            steps {
                dir("frontend") {
                    sh """
                        npm ci
                        npm run build
                    """
                }
            }
        }

        stage("SonarQube Analysis") {
            when {
                allOf {
                    branch "develop"
                    expression { params.ENABLE_SONAR }
                }
            }
            steps {
                script {
                    def scannerHome = tool "sonar-scanner"
                    withSonarQubeEnv("SonarQube") {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                              -Dsonar.projectKey=${PROJECT_NAME} \
                              -Dsonar.sources=frontend/src
                        """
                    }
                }
            }
        }

        stage("Deploy Frontend") {
            when {
                allOf {
                    anyOf {
                        branch "main"
                        branch "master"
                        branch "develop"
                    }
                    expression { fileExists("frontend/dist") }
                }
            }
            steps {
                sh """
                    echo "Deploying frontend to $TARGET_DIR"
                    mkdir -p "$TARGET_DIR"
                    rm -rf "$TARGET_DIR"/*
                    cp -r frontend/dist/* "$TARGET_DIR"/
                """
            }
        }

        stage("Start Database") {
            when {
                allOf {
                    expression { params.DB_CREDENTIALS_ID?.trim() }
                    expression { fileExists("database") }
                }
            }
            steps {
                withDbCredentials(params.DB_CREDENTIALS_ID) {
                    sh """
                        echo "Starting DB container $DB_CONTAINER"
                        docker stop $DB_CONTAINER || true
                        docker rm $DB_CONTAINER || true
                        docker run -d \
                            --name $DB_CONTAINER \
                            --restart unless-stopped \
                            --network infra-net \
                            -e POSTGRES_USER=$DB_USER \
                            -e POSTGRES_PASSWORD=$DB_PASSWORD \
                            -e POSTGRES_DB=$DB_NAME \
                            -v $DB_VOLUME:/var/lib/postgresql/data \
                            -v $WORKSPACE/database:/docker-entrypoint-initdb.d \
                            postgres:17
                    """
                }
            }
        }

        stage("Initialize Database") {
            when {
                allOf {
                    expression { params.DB_CREDENTIALS_ID?.trim() }
                    expression { fileExists("database/schema.sql") }
                }
            }
            steps {
                withDbCredentials(params.DB_CREDENTIALS_ID) {
                    sh """
                        TABLE_EXISTS=\$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT to_regclass('public.poll')")
                        if [ "\$TABLE_EXISTS" = "" ]; then
                            echo "Initializing schema..."
                            docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < database/schema.sql
                        else
                            echo "Database already initialized."
                        fi
                    """
                }
            }
        }

        stage("Deploy Backend") {
            when {
                allOf {
                    anyOf {
                        branch "main"
                        branch "master"
                        branch "develop"
                    }
                    expression { params.DB_CREDENTIALS_ID?.trim() }
                    expression { fileExists("backend/Dockerfile") }
                }
            }
            steps {
                withDbCredentials(params.DB_CREDENTIALS_ID) {
                    sh """
                        docker build -t $BACKEND_CONTAINER backend/
                        docker stop $BACKEND_CONTAINER || true
                        docker rm $BACKEND_CONTAINER || true
                        docker run -d \
                            --name $BACKEND_CONTAINER \
                            --restart unless-stopped \
                            --network infra-net \
                            -e DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_CONTAINER:5432/$DB_NAME" \
                            $BACKEND_CONTAINER
                    """
                }
            }
        }
    }

    post {
        always {
            deleteDir()
        }
    }
}
