# install deps

```
yarn install (npm install is probably fine)
```

# run

```
yarn run dev / npm run dev
```

# movement

move the camera with up and down arrow

# sources

https://medium.com/@lioie6478/metaball-effect-with-glsl-78c453ef46f4

https://webgpulab.xbdev.net/index.php?page=editor&id=metaballs&

this entire website: https://webgpufundamentals.org/

# further optimization

you could optimize the amount of range checks done by putting all metaballs into predefined spaces with like a 3d quadtree and only checking spaces that are close to the camera. we can figure out where the pixel is based on the uv and the camera z value and only check adjacent cubes. this depends on the radius of the cubes. https://gameprogrammingpatterns.com/spatial-partition.html
