import { World, setWorldConstructor } from '@cucumber/cucumber';

class CustomWorld extends World {
  constructor(options: any) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);

export { CustomWorld };