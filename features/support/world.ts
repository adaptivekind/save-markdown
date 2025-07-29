import { World, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';

class CustomWorld extends World {
  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);

export { CustomWorld };
