//
// template-rt.cpp
//

#define _CRT_SECURE_NO_WARNINGS
#include "matm.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

//Resolution

int g_width;
int g_height;

//max number of spheres
int MAX_SPHERES = 5;
int MAX_LIGHTS = 5;
int MIN_HIT_TIME = 1;
int MAX_NUM_REFLECTIONS = 3;
int SHADOW_TIME = 0.0001f;

char file_name[100];


struct Ray
{
    vec4 origin;
    vec4 dir;
};

// TODO: add structs for spheres, lights and anything else you may need.

struct Sphere
{
    string name;
    vec4 position;
    vec3 scale;
    vec4 color;
    
    float K_a;
    float K_d;
    float K_s;
    float K_r;
    float specular_exponent;
    mat4 inverse;
};

struct Light
{
    string name;
    vec4 position;
    vec4 color;
};

vec4 g_background_color;
vec4 g_ambient_color;

vector<vec4> g_colors;    //vector of colors
vector<Sphere> g_spheres;  //vector of spheres
vector<Light> g_lights;  //vector of lights

float g_left;
float g_right;
float g_top;
float g_bottom;
float g_near;




// -------------------------------------------------------------------
// Input file parsing

vec4 toVec4(const string& s1, const string& s2, const string& s3)
{
    stringstream ss(s1 + " " + s2 + " " + s3);
    vec4 result;
    ss >> result.x >> result.y >> result.z;
    result.w = 1.0f;
    return result;
}

///////////////////////////////////////////////////////////////////////////////////
inline vec3 toVec3(vec4 in)
{
    return vec3(in[0], in[1], in[2]);
}
///////////////////////////////////////////////////////////////////////////////////

float toFloat(const string& s)
{
    stringstream ss(s);
    float f;
    ss >> f;
    return f;
}

void parseLine(const vector<string>& vs)
{
  //TODO: add parsing of NEAR, LEFT, RIGHT, BOTTOM, TOP, SPHERE, LIGHT, BACK, AMBIENT, OUTPUT.
  const int num_labels = 11;
  const string labels[] = {"NEAR", "LEFT", "RIGHT", "BOTTOM", "TOP", "RES", "SPHERE", "LIGHT", "BACK", "AMBIENT", "OUTPUT"};
  unsigned label_id = find(labels, labels+num_labels, vs[0]) - labels;
  
  switch(label_id)
  {
  case 0:
          g_near = toFloat(vs[1]);
          break;
  case 1:
          g_left = toFloat(vs[1]);
          break;
  case 2:
          g_right = toFloat(vs[1]);
          break;
  case 3:
          g_bottom = toFloat(vs[1]);
          break;
  case 4:
          g_top = toFloat(vs[1]);
          break;
  case 5:  //RES
          g_height = (int) toFloat(vs[2]);
          g_width = (int) toFloat(vs[1]);
          g_colors.resize((unsigned int) (g_height * g_width));
          break;
  case 6: //SPHERE
          if(g_spheres.size() < MAX_SPHERES)
          {
              Sphere sphere;
              sphere.name = vs[1];
              //  sphere.position = vec3(toFloat(vs[2]), toFloat(vs[3]), toFloat(vs[4]));
              sphere.position = toVec4(vs[2], vs[3], vs[4]);
              sphere.scale = vec3(toFloat(vs[5]), toFloat(vs[6]), toFloat(vs[7]));
              sphere.color = toVec4(vs[8], vs[9], vs[10]);
              sphere.K_a = toFloat(vs[11]);
              sphere.K_d = toFloat(vs[12]);
              sphere.K_s = toFloat(vs[13]);
              sphere.K_r = toFloat(vs[14]);
              sphere.specular_exponent = toFloat(vs[15]);
              InvertMatrix(Scale(sphere.scale), sphere.inverse);
  
              g_spheres.push_back(sphere);
          }
          break;
  case 7: //LIGHT
          if(g_lights.size() < MAX_LIGHTS)
          {
              Light light;
              light.name = vs[1];
              light.position = toVec4(vs[2], vs[3], vs[4]);
              light.color = toVec4(vs[5], vs[6], vs[7]);
  
              g_lights.push_back(light);
          }
          break;
  case 8: //BACK
          g_background_color = vec4(toFloat(vs[1]), toFloat(vs[2]), toFloat(vs[3]), 0);
          break;
  case 9: //AMBIENT
          g_ambient_color = vec4(toFloat(vs[1]), toFloat(vs[2]), toFloat(vs[3]), 0);
          break;
  case 10: //OUTPUT
          for(int i = 0; i < vs[1].size(); i++)
          {
              file_name[i] = vs[1][i];  //C-string of the file_name because savePPM takes in a C-string
          }
          break;
  }
}

void loadFile(const char* filename)
{
    ifstream is(filename);
    if (is.fail())
    {
        cout << "Could not open file " << filename << endl;
        exit(1);
    }
    string s;
    vector<string> vs;
    while(!is.eof())
    {
        vs.clear();
        getline(is, s);
        istringstream iss(s);
        while (!iss.eof())
        {
            string sub;
            iss >> sub;
            vs.push_back(sub);
        }
        parseLine(vs);
    }
}


// -------------------------------------------------------------------
// Utilities

void setColor(int ix, int iy, const vec4& color)
{
    int iy2 = g_height - iy - 1; // Invert iy coordinate.
    g_colors[iy2 * g_width + ix] = color;
}


// -------------------------------------------------------------------
// Intersection routine

float intersection(Ray ray, Sphere sphere, int id)
{
    vec4 S = sphere.position - ray.origin;
    vec4 c = ray.dir;
    
    mat4 inverse_matrix = sphere.inverse;      //used Scale to get transformation matrix then inverted it and
    //stored it in the Sphere class
    vec4 inverse_times_S = inverse_matrix * S;
    vec4 inverse_times_c = inverse_matrix * c;
    
    //equation on slides says "drop 1 and 0 to get r prime in 3D space" so make into vec3
    vec3 S_PRIME = toVec3(inverse_times_S);
    vec3 c_PRIME = toVec3(inverse_times_c);
    
    //compose the desired quadratic equation: |c^2|t^2 + 2(S.tc) + |S|^2 - 1 = 0
    float component_a = dot(c_PRIME, c_PRIME);
    float component_b = dot(S_PRIME, c_PRIME);
    float component_c = dot(S_PRIME, S_PRIME) - 1;
    
    float discriminant = (component_b * component_b) - (component_a * component_c);
    
    if(discriminant < 0)  //does not intersect
    {
        return -1;
    }
    else if(discriminant == 0)  //then we only have one solution
    {
        float sol_1 = (component_b/component_a);
        if(id == 0)
        {
            if(sol_1 >= MIN_HIT_TIME)  //make sure that this solution is above the minimum hit time
            {
                return sol_1;
            }
            else                      //if not return -1
                return -1;
        }
    }
    else if(discriminant > 0)
    {
        float disc_root = sqrtf(discriminant);
        float sol_1 = (component_b/component_a) + (disc_root/component_a); //the times at which the
        float sol_2 = (component_b/component_a) - (disc_root/component_a); //intersection(s) occur
        
        if(id == 0)
        {
            //choose the smaller of the two solutions that is also greater than 1
            if(sol_1 >= MIN_HIT_TIME && sol_2 >= MIN_HIT_TIME)  //if both are above min hit time, choose the lesser
            {
                return (sol_1 <= sol_2) ? sol_1 : sol_2;
            }
            else if(sol_1 >= MIN_HIT_TIME)  //if only solution 1 is above min hit time, return sol_1 if its
            {
                return sol_1;
            }
            else if(sol_2 >= MIN_HIT_TIME) //if only solution 2 is abobe min hit time, return sol_2
            {
                return sol_2;
            }
            else    //if neither are above minimum hit time
            {
                return -1;
            }
        }
        else if(id > 0)
        {
            if(sol_1 >= SHADOW_TIME  && sol_2 >= SHADOW_TIME)  //if both are above min hit time, choose the lesser
            {
                return (sol_1 < sol_2) ? sol_1 : sol_2;
            }
            else if(sol_1 >= SHADOW_TIME)  //if only solution 1 is above min hit time, return sol_1 if its
            {
                return sol_1;
            }
            else if(sol_2 >= SHADOW_TIME) //if only solution 2 is abobe min hit time, return sol_2
            {
                return sol_2;
            }
            else    //if neither are above minimum hit time
            {
                return -1;
            }
        }
        
    }
    return -1;
}

// -------------------------------------------------------------------
// Ray tracing

vec4 trace(const Ray& ray, int iteration)
{
    int sphere_index = 0;
    
    float smallest_t_value = INT_MAX; //if there was no intersection it will be -1
    
    for(int i = 0; i < g_spheres.size(); i++) //go thru each sphere to see if the light hits it
    {
        float temp = intersection(ray, g_spheres[i], iteration);  //this will give all of the t-values for each sphere
        //that the light
        //ray intersects. We must choose the smallest t-value
        
        if(smallest_t_value == INT_MAX && temp != -1 && temp >= 1 && iteration == 0)    //set smallest_t_value equal to the first intersection
        {
            smallest_t_value = temp;
            sphere_index = i;
        }
        else if(temp < smallest_t_value && temp >= 1 && iteration == 0)//non-reflected ray t_val
        {
            smallest_t_value = temp;
            sphere_index = i;
        }
        else if(temp < smallest_t_value && temp >= 0.0001f && iteration > 0) //reflected ray t_val
        {
            smallest_t_value = temp;
            sphere_index = i;
        }
        else
            continue;
    }
   
    if((smallest_t_value == INT_MAX || smallest_t_value == -1) && iteration == 0) //if the light ray did not intersect any spheres, return background color. iteration == 0 makes sure that we are only doing this for the primary ray not reflected rays. If a reflected ray doesn't hit a sphere we DO NOT want to return background color
    {
        return g_background_color;
    }
    if(smallest_t_value == INT_MAX)
    {
        return vec4();
    }
   
   
    
    // Ray(t) = S + tc
    vec4 closest_intersection = ray.origin + (smallest_t_value * ray.dir);
    
    //K_a*I_a[c]*O[c]
    vec4 flat_color = g_spheres[sphere_index].K_a * g_ambient_color * g_spheres[sphere_index].color;
    
    //N = M^-1 * n
    vec4 N = transpose(g_spheres[sphere_index].inverse) *  g_spheres[sphere_index].inverse * (closest_intersection - g_spheres[sphere_index].position);
    N.w = 0;
    N = normalize(N);
    
    
    vec4 diffuse_color;
    vec4 specular_color;
    
    
    for(int i = 0; i < g_lights.size(); i++)
    {
        Ray light_ray;
        light_ray.dir = normalize(g_lights[i].position - closest_intersection); //calculate direction of ray
        vec4 L = light_ray.dir;
        light_ray.origin = closest_intersection;   //treat intersection point as origin
        
        
        /////////////////////////////////////////FOR SHADOWS//////////////////////////////////////
        float temp2 = -1;
        float permanent_value = -1;
        for(int x = 0; x < g_spheres.size(); x++)
        {
            temp2 = intersection(light_ray, g_spheres[x], 1);  // if the ray between the intersection point and the light source intersects some other sphere, you want to create a shadow by not adding the specular and diffuse contributions
            
            if(temp2 >= 0.0001f)// && temp2 < 1)   //if no intersection, temp2 will be -1, else
            {
                permanent_value = 0;  //means it hit something
            }
        }
        if(permanent_value == 0)
        {
            //if a light ray hits something, dont add diffuse and specular colors.
            continue;
        }
        
        if(dot(N, L) > 0)
        {
            //{Kd*Ip[c]*(N.L)*O[c]  //L is vector in the direction of the light, find summation of diffuse colors
            diffuse_color += g_spheres[sphere_index].K_d * g_lights[i].color * dot(N, L) * g_spheres[sphere_index].color;
            
            //R = 2N(N.L) - L
            vec4 R = normalize(2 * N * (dot(N, L)) - L);
            vec4 V = normalize(ray.dir);
            
            //+Ks*Ip[c]*(R.V)^n}   find summation of specular colors
            specular_color += g_spheres[sphere_index].K_s * g_lights[i].color * powf(dot(R, V), g_spheres[sphere_index].specular_exponent);
            
        }
        
        
        //////////////////////////////////////////////////////////////////////////////////////////
    }
    
    vec4 reflected_color;
    if(iteration < MAX_NUM_REFLECTIONS)
    {
        Ray reflected_ray;
        reflected_ray.origin = closest_intersection;
        reflected_ray.dir = normalize(ray.dir - 2.0f * N * dot(N, ray.dir));
        
        // + Kr*(Color returned from reflection ray)
        iteration += 1;
        reflected_color = g_spheres[sphere_index].K_r * trace(reflected_ray, iteration);
    }
    
    // vec4 final_color = flat_color + diffuse_color + specular_color + reflected_color;
    vec4 final_color = flat_color + diffuse_color + specular_color + reflected_color;
    
    return final_color;
}

vec4 getDir(int ix, int iy)
{
    // to pixel (ix, iy), normalized.
    
     float x = (g_right - g_left)/(float)g_width * (float)ix + g_left;
     float y = (g_top - g_bottom)/(float)g_height * (float)iy + g_bottom;
     return normalize(vec4(x, y, -g_near, 0.0f));
}

void renderPixel(int ix, int iy)
{
    Ray ray;
    ray.origin = vec4(0.0f, 0.0f, 0.0f, 1.0f);
    ray.dir = getDir(ix, iy);
    vec4 color = trace(ray, 0);
    setColor(ix, iy, color);
}

void render()
{
    for (int iy = 0; iy < g_height; iy++)
        for (int ix = 0; ix < g_width; ix++)
            renderPixel(ix, iy);
}


// -------------------------------------------------------------------
// PPM saving

void savePPM(int Width, int Height, char* fname, unsigned char* pixels)
{
    FILE *fp;
    const int maxVal=255;
    
    printf("Saving image %s: %d x %d\n", fname, Width, Height);
    fp = fopen(fname,"wb");
    if (!fp) {
        printf("Unable to open file '%s'\n", fname);
        return;
    }
    fprintf(fp, "P6\n");
    fprintf(fp, "%d %d\n", Width, Height);
    fprintf(fp, "%d\n", maxVal);
    
    for(int j = 0; j < Height; j++) {
        fwrite(&pixels[j*Width*3], 3, Width, fp);
    }
    
    fclose(fp);
}

void saveFile()
{
    // Convert color components from floats to unsigned chars.
    unsigned char* buf = new unsigned char[g_width * g_height * 3];
    for (int y = 0; y < g_height; y++)
        for (int x = 0; x < g_width; x++)
            for (int i = 0; i < 3; i++)
            {
                float color = ((float*)g_colors[y*g_width+x])[i]; //grab the color
                if (color > 1)
                {
                    color = 1;  //if the color is greater than 1 clamp it to 1
                }
                buf[y*g_width*3+x*3+i] = (unsigned char)(color * 255.9f);
            }
    savePPM(g_width, g_height, file_name, buf);
    delete[] buf;
}


// -------------------------------------------------------------------
// Main

int main(int argc, char* argv[])
{
    if (argc < 2)
    {
        cout << "Usage: template-rt <input_file.txt>" << endl;
        exit(1);
    }
    loadFile(argv[1]);
    render();
    saveFile();
    return 0;
}


