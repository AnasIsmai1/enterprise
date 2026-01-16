#!/bin/sh

MODULE=$1
MODULE=$(echo "$MODULE" | tr '[:upper:]' '[:lower:]')
BASE="src/modules/$MODULE"

if [ -z "$MODULE" ]; then
  printf "Enter module name: "
  read MODULE
  if [ -z "$MODULE" ]; then
    echo "Module name is required."
    exit 1
  fi
  BASE="src/modules/$MODULE"
fi


DIRS="
application/dtos
application/services
core/entities
core/exceptions
core/value-objects
core/interfaces
core/interfaces/services
core/interfaces/repositories
infrastructure/cache
infrastructure/providers
infrastructure/repositories
infrastructure/schemas
infrastructure/factories
presentation/controllers
presentation/decorators
presentation/filters
presentation/guards
presentation/interceptors
presentation/middlewares
presentation/pipes
"

for DIR in $DIRS; do
  mkdir -p "$BASE/$DIR"
done

nest g module "modules/$MODULE/presentation/$MODULE" --flat
nest g controller "modules/$MODULE/presentation/controllers/$MODULE" --flat
nest g service "modules/$MODULE/application/services/$MODULE" --flat

echo "NestJS module structure for '$MODULE' created."
echo "Note: Please manually import and add the generated service to the providers array in your module file if it was not added automatically."

